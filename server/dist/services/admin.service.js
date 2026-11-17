import fs from 'node:fs/promises';
import https from 'node:https';
import { getUserDocId, normalizeEmail, generateAdminPassword, } from '../auth/crypto.js';
import { hashPassword } from '../auth/password.js';
export class AdminService {
    repo;
    config;
    constructor(repo, config) {
        this.repo = repo;
        this.config = config;
    }
    async bootstrapAdmin() {
        const adminEmail = normalizeEmail(this.config.ADMIN_EMAIL);
        const adminId = getUserDocId(adminEmail);
        const existing = await this.repo.users.getById(adminId);
        if (existing) {
            return; // Admin already bootstrapped
        }
        const initialPassword = generateAdminPassword();
        const passwordHash = await hashPassword(initialPassword);
        const adminDoc = {
            _id: adminId,
            email: adminEmail,
            passwordHash,
            role: 'admin',
            mustChangePassword: true,
            createdAt: new Date().toISOString(),
            type: 'user',
        };
        try {
            await this.repo.users.create(adminDoc);
        }
        catch (err) {
            if (err.status === 409 || err.statusCode === 409) {
                return; // Another replica won the race
            }
            throw err;
        }
        // Deliver password via Kubernetes Secret or local secure file
        try {
            await this.deliverAdminPassword(adminEmail, initialPassword);
        }
        catch (err) {
            // Rollback admin doc on delivery failure
            try {
                await this.repo.users.delete(adminId);
            }
            catch { }
            throw new Error(`Failed to deliver initial admin password: ${err.message}`);
        }
    }
    async deliverAdminPassword(adminEmail, password) {
        const k8sTokenPath = '/var/run/secrets/kubernetes.io/serviceaccount/token';
        let isKubernetes = false;
        try {
            await fs.access(k8sTokenPath);
            isKubernetes = true;
        }
        catch { }
        if (isKubernetes) {
            await this.createK8sSecret(adminEmail, password);
        }
        else {
            // Local dev: write to gitignored file with mode 0600
            const filePath = 'todo-admin-initial.txt';
            const content = `Admin initial credentials:\nEmail: ${adminEmail}\nPassword: ${password}\n\nPlease log in and change this password immediately.\n`;
            await fs.writeFile(filePath, content, { mode: 0o600 });
        }
    }
    async createK8sSecret(adminEmail, password) {
        const token = await fs.readFile('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf-8');
        const ca = await fs.readFile('/var/run/secrets/kubernetes.io/serviceaccount/ca.crt');
        const namespace = this.config.KUBERNETES_NAMESPACE;
        const secretName = this.config.ADMIN_SECRET_NAME;
        const payload = JSON.stringify({
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
                name: secretName,
                namespace,
            },
            type: 'Opaque',
            stringData: {
                'admin-email': adminEmail,
                'admin-initial-password': password,
            },
        });
        return new Promise((resolve, reject) => {
            const req = https.request({
                host: 'kubernetes.default.svc',
                port: 443,
                path: `/api/v1/namespaces/${namespace}/secrets`,
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
                ca,
            }, (res) => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                }
                else if (res.statusCode === 409) {
                    // Secret already exists
                    resolve();
                }
                else {
                    let data = '';
                    res.on('data', (chunk) => (data += chunk));
                    res.on('end', () => reject(new Error(`K8s Secret creation failed with HTTP ${res.statusCode}: ${data}`)));
                }
            });
            req.on('error', reject);
            req.write(payload);
            req.end();
        });
    }
    async getStats() {
        const allUsers = await this.repo.users.listAll();
        const regularUsers = allUsers.filter((u) => u.role !== 'admin');
        const allTodos = await this.repo.todos.listAll();
        const now = Date.now();
        const userStats = regularUsers.map((user) => {
            const userTodos = allTodos.filter((t) => t.userId === user._id);
            const total = userTodos.length;
            const done = userTodos.filter((t) => t.completed).length;
            const open = total - done;
            const overdue = userTodos.filter((t) => !t.completed &&
                t.dueDate &&
                new Date(t.dueDate).getTime() < now).length;
            return {
                userId: user._id,
                email: user.email,
                total,
                done,
                open,
                overdue,
            };
        });
        return {
            totalUsers: regularUsers.length,
            users: userStats,
        };
    }
}
//# sourceMappingURL=admin.service.js.map
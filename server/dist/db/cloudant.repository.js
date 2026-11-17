import { CloudantV1, IamAuthenticator, BasicAuthenticator, } from '@ibm-cloud/cloudant';
export class CloudantUserRepository {
    client;
    db;
    constructor(client, db) {
        this.client = client;
        this.db = db;
    }
    async create(user) {
        const res = await this.client.putDocument({
            db: this.db,
            docId: user._id,
            document: user,
        });
        return { ...user, _rev: res.result.rev };
    }
    async getById(id) {
        try {
            const res = await this.client.getDocument({
                db: this.db,
                docId: id,
            });
            return res.result;
        }
        catch (err) {
            if (err.status === 404 || err.statusCode === 404)
                return null;
            throw err;
        }
    }
    async update(user) {
        const res = await this.client.putDocument({
            db: this.db,
            docId: user._id,
            document: user,
        });
        return { ...user, _rev: res.result.rev };
    }
    async listAll() {
        const res = await this.client.postAllDocs({
            db: this.db,
            includeDocs: true,
        });
        return (res.result.rows
            ?.filter((r) => r.doc && r.id && !r.id.startsWith('_design/'))
            .map((r) => r.doc) || []);
    }
    async delete(id, rev) {
        let docRev = rev;
        if (!docRev) {
            const existing = await this.getById(id);
            if (!existing)
                return;
            docRev = existing._rev;
        }
        if (docRev) {
            await this.client.deleteDocument({
                db: this.db,
                docId: id,
                rev: docRev,
            });
        }
    }
}
export class CloudantSessionRepository {
    client;
    db;
    constructor(client, db) {
        this.client = client;
        this.db = db;
    }
    async create(session) {
        const res = await this.client.putDocument({
            db: this.db,
            docId: session._id,
            document: session,
        });
        return { ...session, _rev: res.result.rev };
    }
    async getById(id) {
        try {
            const res = await this.client.getDocument({
                db: this.db,
                docId: id,
            });
            return res.result;
        }
        catch (err) {
            if (err.status === 404 || err.statusCode === 404)
                return null;
            throw err;
        }
    }
    async delete(id, rev) {
        let docRev = rev;
        if (!docRev) {
            const existing = await this.getById(id);
            if (!existing)
                return;
            docRev = existing._rev;
        }
        if (docRev) {
            await this.client.deleteDocument({
                db: this.db,
                docId: id,
                rev: docRev,
            });
        }
    }
    async deleteByUserId(userId) {
        const res = await this.client.postFind({
            db: this.db,
            selector: { userId },
            limit: 1000,
        });
        for (const doc of res.result.docs || []) {
            if (doc._id && doc._rev) {
                await this.client.deleteDocument({
                    db: this.db,
                    docId: doc._id,
                    rev: doc._rev,
                });
            }
        }
    }
}
export class CloudantApiTokenRepository {
    client;
    db;
    constructor(client, db) {
        this.client = client;
        this.db = db;
    }
    async create(token) {
        const res = await this.client.putDocument({
            db: this.db,
            docId: token._id,
            document: token,
        });
        return { ...token, _rev: res.result.rev };
    }
    async getById(id) {
        try {
            const res = await this.client.getDocument({
                db: this.db,
                docId: id,
            });
            return res.result;
        }
        catch (err) {
            if (err.status === 404 || err.statusCode === 404)
                return null;
            throw err;
        }
    }
    async listByUserId(userId) {
        const res = await this.client.postFind({
            db: this.db,
            selector: { userId, revoked: { $eq: false } },
            limit: 1000,
        });
        return res.result.docs || [];
    }
    async update(token) {
        const res = await this.client.putDocument({
            db: this.db,
            docId: token._id,
            document: token,
        });
        return { ...token, _rev: res.result.rev };
    }
    async delete(id, rev) {
        let docRev = rev;
        if (!docRev) {
            const existing = await this.getById(id);
            if (!existing)
                return;
            docRev = existing._rev;
        }
        if (docRev) {
            await this.client.deleteDocument({
                db: this.db,
                docId: id,
                rev: docRev,
            });
        }
    }
}
export class CloudantTodoRepository {
    client;
    db;
    constructor(client, db) {
        this.client = client;
        this.db = db;
    }
    async create(todo) {
        const res = await this.client.putDocument({
            db: this.db,
            docId: todo._id,
            document: todo,
        });
        return { ...todo, _rev: res.result.rev };
    }
    async getById(id) {
        try {
            const res = await this.client.getDocument({
                db: this.db,
                docId: id,
            });
            return res.result;
        }
        catch (err) {
            if (err.status === 404 || err.statusCode === 404)
                return null;
            throw err;
        }
    }
    async listByUserId(userId) {
        const res = await this.client.postFind({
            db: this.db,
            selector: { userId },
            limit: 1000,
        });
        return res.result.docs || [];
    }
    async update(todo) {
        const res = await this.client.putDocument({
            db: this.db,
            docId: todo._id,
            document: todo,
        });
        return { ...todo, _rev: res.result.rev };
    }
    async delete(id, rev) {
        let docRev = rev;
        if (!docRev) {
            const existing = await this.getById(id);
            if (!existing)
                return;
            docRev = existing._rev;
        }
        if (docRev) {
            await this.client.deleteDocument({
                db: this.db,
                docId: id,
                rev: docRev,
            });
        }
    }
    async listAll() {
        const res = await this.client.postAllDocs({
            db: this.db,
            includeDocs: true,
        });
        return (res.result.rows
            ?.filter((r) => r.doc && r.id && !r.id.startsWith('_design/'))
            .map((r) => r.doc) || []);
    }
}
export class CloudantAppRepository {
    client;
    config;
    users;
    sessions;
    apiTokens;
    todos;
    constructor(client, config) {
        this.client = client;
        this.config = config;
        this.users = new CloudantUserRepository(client, config.DB_USERS);
        this.sessions = new CloudantSessionRepository(client, config.DB_SESSIONS);
        this.apiTokens = new CloudantApiTokenRepository(client, config.DB_API_TOKENS);
        this.todos = new CloudantTodoRepository(client, config.DB_TODOS);
    }
    async init() {
        const dbs = [
            this.config.DB_USERS,
            this.config.DB_SESSIONS,
            this.config.DB_API_TOKENS,
            this.config.DB_TODOS,
        ];
        for (const db of dbs) {
            try {
                await this.client.putDatabase({ db });
            }
            catch (err) {
                if (err.status !== 412 && err.statusCode !== 412) {
                    // 412 Precondition Failed = database already exists
                    // If we lack permissions to create, verify access
                    try {
                        await this.client.getDatabaseInformation({ db });
                    }
                    catch (innerErr) {
                        throw new Error(`Failed to access or create Cloudant database "${db}": ${err.message}`);
                    }
                }
            }
        }
        // Create Mango index on userId for todos
        try {
            await this.client.postIndex({
                db: this.config.DB_TODOS,
                index: {
                    fields: [{ userId: 'asc' }],
                },
                name: 'userId-index',
                type: 'json',
            });
        }
        catch {
            // Index creation might already exist or lack permission, which is acceptable
        }
        // Create Mango index on userId for api_tokens
        try {
            await this.client.postIndex({
                db: this.config.DB_API_TOKENS,
                index: {
                    fields: [{ userId: 'asc' }, { revoked: 'asc' }],
                },
                name: 'userId-revoked-index',
                type: 'json',
            });
        }
        catch {
            // Ignored if already exists
        }
    }
}
export function createCloudantClient(cfg) {
    let authenticator;
    if (cfg.CLOUDANT_APIKEY) {
        authenticator = new IamAuthenticator({
            apikey: cfg.CLOUDANT_APIKEY,
        });
    }
    else {
        authenticator = new BasicAuthenticator({
            username: cfg.CLOUDANT_USERNAME || 'admin',
            password: cfg.CLOUDANT_PASSWORD || '',
        });
    }
    return CloudantV1.newInstance({
        authenticator,
        serviceUrl: cfg.CLOUDANT_URL,
    });
}
//# sourceMappingURL=cloudant.repository.js.map
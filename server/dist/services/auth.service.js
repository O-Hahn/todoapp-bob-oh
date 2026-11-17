import { getUserDocId, getSessionDocId, normalizeEmail, generateToken, } from '../auth/crypto.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
export class AuthService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async register(email, password) {
        const normalized = normalizeEmail(email);
        const userId = getUserDocId(normalized);
        const existing = await this.repo.users.getById(userId);
        if (existing) {
            const err = new Error('Email already registered');
            err.statusCode = 409;
            err.code = 'EMAIL_EXISTS';
            throw err;
        }
        const passwordHash = await hashPassword(password);
        const userDoc = {
            _id: userId,
            email: normalized,
            passwordHash,
            role: 'user',
            mustChangePassword: false,
            createdAt: new Date().toISOString(),
            type: 'user',
        };
        try {
            await this.repo.users.create(userDoc);
        }
        catch (err) {
            if (err.status === 409 || err.statusCode === 409) {
                const conflictErr = new Error('Email already registered');
                conflictErr.statusCode = 409;
                conflictErr.code = 'EMAIL_EXISTS';
                throw conflictErr;
            }
            throw err;
        }
        return {
            id: userDoc._id,
            email: userDoc.email,
            role: userDoc.role,
            mustChangePassword: userDoc.mustChangePassword,
        };
    }
    async login(email, password) {
        const normalized = normalizeEmail(email);
        const userId = getUserDocId(normalized);
        const user = await this.repo.users.getById(userId);
        if (!user) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            err.code = 'INVALID_CREDENTIALS';
            throw err;
        }
        const valid = await verifyPassword(user.passwordHash, password);
        if (!valid) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            err.code = 'INVALID_CREDENTIALS';
            throw err;
        }
        const token = generateToken();
        const sessionId = getSessionDocId(token);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const sessionDoc = {
            _id: sessionId,
            userId: user._id,
            userEmail: user.email,
            userRole: user.role,
            mustChangePassword: user.mustChangePassword,
            expiresAt,
            createdAt: new Date().toISOString(),
            type: 'session',
        };
        await this.repo.sessions.create(sessionDoc);
        return {
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                mustChangePassword: user.mustChangePassword,
            },
            sessionToken: token,
        };
    }
    async validateSession(token) {
        if (!token)
            return null;
        const sessionId = getSessionDocId(token);
        const session = await this.repo.sessions.getById(sessionId);
        if (!session)
            return null;
        if (new Date(session.expiresAt) < new Date()) {
            // Lazy delete expired session
            await this.repo.sessions.delete(session._id, session._rev);
            return null;
        }
        // Refresh latest user status from DB
        const user = await this.repo.users.getById(session.userId);
        if (!user) {
            await this.repo.sessions.delete(session._id, session._rev);
            return null;
        }
        return {
            id: user._id,
            email: user.email,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
        };
    }
    async logout(token) {
        if (!token)
            return;
        const sessionId = getSessionDocId(token);
        await this.repo.sessions.delete(sessionId);
    }
    async changePassword(userId, currentPass, newPass) {
        const user = await this.repo.users.getById(userId);
        if (!user) {
            const err = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }
        const valid = await verifyPassword(user.passwordHash, currentPass);
        if (!valid) {
            const err = new Error('Current password is incorrect');
            err.statusCode = 400;
            err.code = 'INVALID_CURRENT_PASSWORD';
            throw err;
        }
        const newHash = await hashPassword(newPass);
        user.passwordHash = newHash;
        user.mustChangePassword = false;
        const updated = await this.repo.users.update(user);
        // Invalidate other sessions
        await this.repo.sessions.deleteByUserId(userId);
        return {
            id: updated._id,
            email: updated.email,
            role: updated.role,
            mustChangePassword: updated.mustChangePassword,
        };
    }
}
//# sourceMappingURL=auth.service.js.map
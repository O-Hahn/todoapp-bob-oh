export class MemoryUserRepository {
    users = new Map();
    async create(user) {
        if (this.users.has(user._id)) {
            const err = new Error('Document update conflict');
            err.status = 409;
            err.statusCode = 409;
            throw err;
        }
        const doc = { ...user, _rev: '1-rev' };
        this.users.set(user._id, doc);
        return { ...doc };
    }
    async getById(id) {
        const doc = this.users.get(id);
        return doc ? { ...doc } : null;
    }
    async update(user) {
        const existing = this.users.get(user._id);
        if (!existing) {
            const err = new Error('Document not found');
            err.status = 404;
            err.statusCode = 404;
            throw err;
        }
        const doc = { ...user, _rev: '2-rev' };
        this.users.set(user._id, doc);
        return { ...doc };
    }
    async listAll() {
        return Array.from(this.users.values()).map((u) => ({ ...u }));
    }
    async delete(id) {
        this.users.delete(id);
    }
}
export class MemorySessionRepository {
    sessions = new Map();
    async create(session) {
        const doc = { ...session, _rev: '1-rev' };
        this.sessions.set(session._id, doc);
        return { ...doc };
    }
    async getById(id) {
        const doc = this.sessions.get(id);
        return doc ? { ...doc } : null;
    }
    async delete(id) {
        this.sessions.delete(id);
    }
    async deleteByUserId(userId) {
        for (const [key, session] of this.sessions.entries()) {
            if (session.userId === userId) {
                this.sessions.delete(key);
            }
        }
    }
}
export class MemoryApiTokenRepository {
    tokens = new Map();
    async create(token) {
        const doc = { ...token, _rev: '1-rev' };
        this.tokens.set(token._id, doc);
        return { ...doc };
    }
    async getById(id) {
        const doc = this.tokens.get(id);
        return doc ? { ...doc } : null;
    }
    async listByUserId(userId) {
        return Array.from(this.tokens.values())
            .filter((t) => t.userId === userId && !t.revoked)
            .map((t) => ({ ...t }));
    }
    async update(token) {
        const existing = this.tokens.get(token._id);
        if (!existing) {
            const err = new Error('Token not found');
            err.status = 404;
            err.statusCode = 404;
            throw err;
        }
        const doc = { ...token, _rev: '2-rev' };
        this.tokens.set(token._id, doc);
        return { ...doc };
    }
    async delete(id) {
        this.tokens.delete(id);
    }
}
export class MemoryTodoRepository {
    todos = new Map();
    async create(todo) {
        const doc = { ...todo, _rev: '1-rev' };
        this.todos.set(todo._id, doc);
        return { ...doc };
    }
    async getById(id) {
        const doc = this.todos.get(id);
        return doc ? { ...doc } : null;
    }
    async listByUserId(userId) {
        return Array.from(this.todos.values())
            .filter((t) => t.userId === userId)
            .map((t) => ({ ...t }));
    }
    async update(todo) {
        const existing = this.todos.get(todo._id);
        if (!existing) {
            const err = new Error('Todo not found');
            err.status = 404;
            err.statusCode = 404;
            throw err;
        }
        const doc = { ...todo, _rev: '2-rev' };
        this.todos.set(todo._id, doc);
        return { ...doc };
    }
    async delete(id) {
        this.todos.delete(id);
    }
    async listAll() {
        return Array.from(this.todos.values()).map((t) => ({ ...t }));
    }
}
export class MemoryAppRepository {
    users = new MemoryUserRepository();
    sessions = new MemorySessionRepository();
    apiTokens = new MemoryApiTokenRepository();
    todos = new MemoryTodoRepository();
    async init() {
        // No-op for in-memory
    }
}
//# sourceMappingURL=memory.repository.js.map
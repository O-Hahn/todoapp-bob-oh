import {
  IAppRepository,
  IUserRepository,
  ISessionRepository,
  IApiTokenRepository,
  ITodoRepository,
} from './repository.interface.js';
import { UserDoc, SessionDoc, ApiTokenDoc, TodoDoc } from '../types/index.js';

export class MemoryUserRepository implements IUserRepository {
  private users = new Map<string, UserDoc>();

  async create(user: UserDoc): Promise<UserDoc> {
    if (this.users.has(user._id)) {
      const err = new Error('Document update conflict') as any;
      err.status = 409;
      err.statusCode = 409;
      throw err;
    }
    const doc: UserDoc = { ...user, _rev: '1-rev' };
    this.users.set(user._id, doc);
    return { ...doc };
  }

  async getById(id: string): Promise<UserDoc | null> {
    const doc = this.users.get(id);
    return doc ? { ...doc } : null;
  }

  async update(user: UserDoc): Promise<UserDoc> {
    const existing = this.users.get(user._id);
    if (!existing) {
      const err = new Error('Document not found') as any;
      err.status = 404;
      err.statusCode = 404;
      throw err;
    }
    const doc: UserDoc = { ...user, _rev: '2-rev' };
    this.users.set(user._id, doc);
    return { ...doc };
  }

  async listAll(): Promise<UserDoc[]> {
    return Array.from(this.users.values()).map((u) => ({ ...u }));
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }
}

export class MemorySessionRepository implements ISessionRepository {
  private sessions = new Map<string, SessionDoc>();

  async create(session: SessionDoc): Promise<SessionDoc> {
    const doc: SessionDoc = { ...session, _rev: '1-rev' };
    this.sessions.set(session._id, doc);
    return { ...doc };
  }

  async getById(id: string): Promise<SessionDoc | null> {
    const doc = this.sessions.get(id);
    return doc ? { ...doc } : null;
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    for (const [key, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(key);
      }
    }
  }
}

export class MemoryApiTokenRepository implements IApiTokenRepository {
  private tokens = new Map<string, ApiTokenDoc>();

  async create(token: ApiTokenDoc): Promise<ApiTokenDoc> {
    const doc: ApiTokenDoc = { ...token, _rev: '1-rev' };
    this.tokens.set(token._id, doc);
    return { ...doc };
  }

  async getById(id: string): Promise<ApiTokenDoc | null> {
    const doc = this.tokens.get(id);
    return doc ? { ...doc } : null;
  }

  async listByUserId(userId: string): Promise<ApiTokenDoc[]> {
    return Array.from(this.tokens.values())
      .filter((t) => t.userId === userId && !t.revoked)
      .map((t) => ({ ...t }));
  }

  async update(token: ApiTokenDoc): Promise<ApiTokenDoc> {
    const existing = this.tokens.get(token._id);
    if (!existing) {
      const err = new Error('Token not found') as any;
      err.status = 404;
      err.statusCode = 404;
      throw err;
    }
    const doc: ApiTokenDoc = { ...token, _rev: '2-rev' };
    this.tokens.set(token._id, doc);
    return { ...doc };
  }

  async delete(id: string): Promise<void> {
    this.tokens.delete(id);
  }
}

export class MemoryTodoRepository implements ITodoRepository {
  private todos = new Map<string, TodoDoc>();

  async create(todo: TodoDoc): Promise<TodoDoc> {
    const doc: TodoDoc = { ...todo, _rev: '1-rev' };
    this.todos.set(todo._id, doc);
    return { ...doc };
  }

  async getById(id: string): Promise<TodoDoc | null> {
    const doc = this.todos.get(id);
    return doc ? { ...doc } : null;
  }

  async listByUserId(userId: string): Promise<TodoDoc[]> {
    return Array.from(this.todos.values())
      .filter((t) => t.userId === userId)
      .map((t) => ({ ...t }));
  }

  async update(todo: TodoDoc): Promise<TodoDoc> {
    const existing = this.todos.get(todo._id);
    if (!existing) {
      const err = new Error('Todo not found') as any;
      err.status = 404;
      err.statusCode = 404;
      throw err;
    }
    const doc: TodoDoc = { ...todo, _rev: '2-rev' };
    this.todos.set(todo._id, doc);
    return { ...doc };
  }

  async delete(id: string): Promise<void> {
    this.todos.delete(id);
  }

  async listAll(): Promise<TodoDoc[]> {
    return Array.from(this.todos.values()).map((t) => ({ ...t }));
  }
}

export class MemoryAppRepository implements IAppRepository {
  users = new MemoryUserRepository();
  sessions = new MemorySessionRepository();
  apiTokens = new MemoryApiTokenRepository();
  todos = new MemoryTodoRepository();

  async init(): Promise<void> {
    // No-op for in-memory
  }
}

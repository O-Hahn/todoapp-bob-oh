import {
  CloudantV1,
  IamAuthenticator,
  BasicAuthenticator,
} from '@ibm-cloud/cloudant';
import {
  IAppRepository,
  IUserRepository,
  ISessionRepository,
  IApiTokenRepository,
  ITodoRepository,
} from './repository.interface.js';
import { UserDoc, SessionDoc, ApiTokenDoc, TodoDoc } from '../types/index.js';
import { Config } from '../config.js';

export class CloudantUserRepository implements IUserRepository {
  constructor(private client: CloudantV1, private db: string) {}

  async create(user: UserDoc): Promise<UserDoc> {
    const res = await this.client.putDocument({
      db: this.db,
      docId: user._id,
      document: user as unknown as CloudantV1.Document,
    });
    return { ...user, _rev: res.result.rev };
  }

  async getById(id: string): Promise<UserDoc | null> {
    try {
      const res = await this.client.getDocument({
        db: this.db,
        docId: id,
      });
      return res.result as unknown as UserDoc;
    } catch (err: any) {
      if (err.status === 404 || err.statusCode === 404) return null;
      throw err;
    }
  }

  async update(user: UserDoc): Promise<UserDoc> {
    const res = await this.client.putDocument({
      db: this.db,
      docId: user._id,
      document: user as unknown as CloudantV1.Document,
    });
    return { ...user, _rev: res.result.rev };
  }

  async listAll(): Promise<UserDoc[]> {
    const res = await this.client.postAllDocs({
      db: this.db,
      includeDocs: true,
    });
    return (
      res.result.rows
        ?.filter((r) => r.doc && r.id && !r.id.startsWith('_design/'))
        .map((r) => r.doc as unknown as UserDoc) || []
    );
  }

  async delete(id: string, rev?: string): Promise<void> {
    let docRev = rev;
    if (!docRev) {
      const existing = await this.getById(id);
      if (!existing) return;
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

export class CloudantSessionRepository implements ISessionRepository {
  constructor(private client: CloudantV1, private db: string) {}

  async create(session: SessionDoc): Promise<SessionDoc> {
    const res = await this.client.putDocument({
      db: this.db,
      docId: session._id,
      document: session as unknown as CloudantV1.Document,
    });
    return { ...session, _rev: res.result.rev };
  }

  async getById(id: string): Promise<SessionDoc | null> {
    try {
      const res = await this.client.getDocument({
        db: this.db,
        docId: id,
      });
      return res.result as unknown as SessionDoc;
    } catch (err: any) {
      if (err.status === 404 || err.statusCode === 404) return null;
      throw err;
    }
  }

  async delete(id: string, rev?: string): Promise<void> {
    let docRev = rev;
    if (!docRev) {
      const existing = await this.getById(id);
      if (!existing) return;
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

  async deleteByUserId(userId: string): Promise<void> {
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

export class CloudantApiTokenRepository implements IApiTokenRepository {
  constructor(private client: CloudantV1, private db: string) {}

  async create(token: ApiTokenDoc): Promise<ApiTokenDoc> {
    const res = await this.client.putDocument({
      db: this.db,
      docId: token._id,
      document: token as unknown as CloudantV1.Document,
    });
    return { ...token, _rev: res.result.rev };
  }

  async getById(id: string): Promise<ApiTokenDoc | null> {
    try {
      const res = await this.client.getDocument({
        db: this.db,
        docId: id,
      });
      return res.result as unknown as ApiTokenDoc;
    } catch (err: any) {
      if (err.status === 404 || err.statusCode === 404) return null;
      throw err;
    }
  }

  async listByUserId(userId: string): Promise<ApiTokenDoc[]> {
    const res = await this.client.postFind({
      db: this.db,
      selector: { userId, revoked: { $eq: false } },
      limit: 1000,
    });
    return (res.result.docs as unknown as ApiTokenDoc[]) || [];
  }

  async update(token: ApiTokenDoc): Promise<ApiTokenDoc> {
    const res = await this.client.putDocument({
      db: this.db,
      docId: token._id,
      document: token as unknown as CloudantV1.Document,
    });
    return { ...token, _rev: res.result.rev };
  }

  async delete(id: string, rev?: string): Promise<void> {
    let docRev = rev;
    if (!docRev) {
      const existing = await this.getById(id);
      if (!existing) return;
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

export class CloudantTodoRepository implements ITodoRepository {
  constructor(private client: CloudantV1, private db: string) {}

  async create(todo: TodoDoc): Promise<TodoDoc> {
    const res = await this.client.putDocument({
      db: this.db,
      docId: todo._id,
      document: todo as unknown as CloudantV1.Document,
    });
    return { ...todo, _rev: res.result.rev };
  }

  async getById(id: string): Promise<TodoDoc | null> {
    try {
      const res = await this.client.getDocument({
        db: this.db,
        docId: id,
      });
      return res.result as unknown as TodoDoc;
    } catch (err: any) {
      if (err.status === 404 || err.statusCode === 404) return null;
      throw err;
    }
  }

  async listByUserId(userId: string): Promise<TodoDoc[]> {
    const res = await this.client.postFind({
      db: this.db,
      selector: { userId },
      limit: 1000,
    });
    return (res.result.docs as unknown as TodoDoc[]) || [];
  }

  async update(todo: TodoDoc): Promise<TodoDoc> {
    const res = await this.client.putDocument({
      db: this.db,
      docId: todo._id,
      document: todo as unknown as CloudantV1.Document,
    });
    return { ...todo, _rev: res.result.rev };
  }

  async delete(id: string, rev?: string): Promise<void> {
    let docRev = rev;
    if (!docRev) {
      const existing = await this.getById(id);
      if (!existing) return;
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

  async listAll(): Promise<TodoDoc[]> {
    const res = await this.client.postAllDocs({
      db: this.db,
      includeDocs: true,
    });
    return (
      res.result.rows
        ?.filter((r) => r.doc && r.id && !r.id.startsWith('_design/'))
        .map((r) => r.doc as unknown as TodoDoc) || []
    );
  }
}

export class CloudantAppRepository implements IAppRepository {
  users: CloudantUserRepository;
  sessions: CloudantSessionRepository;
  apiTokens: CloudantApiTokenRepository;
  todos: CloudantTodoRepository;

  constructor(private client: CloudantV1, private config: Config) {
    this.users = new CloudantUserRepository(client, config.DB_USERS);
    this.sessions = new CloudantSessionRepository(client, config.DB_SESSIONS);
    this.apiTokens = new CloudantApiTokenRepository(client, config.DB_API_TOKENS);
    this.todos = new CloudantTodoRepository(client, config.DB_TODOS);
  }

  async init(): Promise<void> {
    const dbs = [
      this.config.DB_USERS,
      this.config.DB_SESSIONS,
      this.config.DB_API_TOKENS,
      this.config.DB_TODOS,
    ];

    for (const db of dbs) {
      try {
        await this.client.putDatabase({ db });
      } catch (err: any) {
        if (err.status !== 412 && err.statusCode !== 412) {
          // 412 Precondition Failed = database already exists
          // If we lack permissions to create, verify access
          try {
            await this.client.getDatabaseInformation({ db });
          } catch (innerErr) {
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
    } catch {
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
    } catch {
      // Ignored if already exists
    }
  }
}

export function createCloudantClient(cfg: Config): CloudantV1 {
  let authenticator;
  if (cfg.CLOUDANT_APIKEY) {
    authenticator = new IamAuthenticator({
      apikey: cfg.CLOUDANT_APIKEY,
    });
  } else {
    authenticator = new BasicAuthenticator({
      username: cfg.CLOUDANT_USERNAME || 'admin',
      password: cfg.CLOUDANT_PASSWORD || '',
    });
  }

  return CloudantV1.newInstance({
    authenticator,
    serviceUrl: cfg.CLOUDANT_URL,
    // Fail fast instead of hanging requests when Cloudant is unreachable
    timeout: 15000,
  });
}

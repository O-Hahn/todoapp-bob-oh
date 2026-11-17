import { CloudantV1 } from '@ibm-cloud/cloudant';
import { IAppRepository, IUserRepository, ISessionRepository, IApiTokenRepository, ITodoRepository } from './repository.interface.js';
import { UserDoc, SessionDoc, ApiTokenDoc, TodoDoc } from '../types/index.js';
import { Config } from '../config.js';
export declare class CloudantUserRepository implements IUserRepository {
    private client;
    private db;
    constructor(client: CloudantV1, db: string);
    create(user: UserDoc): Promise<UserDoc>;
    getById(id: string): Promise<UserDoc | null>;
    update(user: UserDoc): Promise<UserDoc>;
    listAll(): Promise<UserDoc[]>;
    delete(id: string, rev?: string): Promise<void>;
}
export declare class CloudantSessionRepository implements ISessionRepository {
    private client;
    private db;
    constructor(client: CloudantV1, db: string);
    create(session: SessionDoc): Promise<SessionDoc>;
    getById(id: string): Promise<SessionDoc | null>;
    delete(id: string, rev?: string): Promise<void>;
    deleteByUserId(userId: string): Promise<void>;
}
export declare class CloudantApiTokenRepository implements IApiTokenRepository {
    private client;
    private db;
    constructor(client: CloudantV1, db: string);
    create(token: ApiTokenDoc): Promise<ApiTokenDoc>;
    getById(id: string): Promise<ApiTokenDoc | null>;
    listByUserId(userId: string): Promise<ApiTokenDoc[]>;
    update(token: ApiTokenDoc): Promise<ApiTokenDoc>;
    delete(id: string, rev?: string): Promise<void>;
}
export declare class CloudantTodoRepository implements ITodoRepository {
    private client;
    private db;
    constructor(client: CloudantV1, db: string);
    create(todo: TodoDoc): Promise<TodoDoc>;
    getById(id: string): Promise<TodoDoc | null>;
    listByUserId(userId: string): Promise<TodoDoc[]>;
    update(todo: TodoDoc): Promise<TodoDoc>;
    delete(id: string, rev?: string): Promise<void>;
    listAll(): Promise<TodoDoc[]>;
}
export declare class CloudantAppRepository implements IAppRepository {
    private client;
    private config;
    users: CloudantUserRepository;
    sessions: CloudantSessionRepository;
    apiTokens: CloudantApiTokenRepository;
    todos: CloudantTodoRepository;
    constructor(client: CloudantV1, config: Config);
    init(): Promise<void>;
}
export declare function createCloudantClient(cfg: Config): CloudantV1;
//# sourceMappingURL=cloudant.repository.d.ts.map
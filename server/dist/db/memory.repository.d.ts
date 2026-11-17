import { IAppRepository, IUserRepository, ISessionRepository, IApiTokenRepository, ITodoRepository } from './repository.interface.js';
import { UserDoc, SessionDoc, ApiTokenDoc, TodoDoc } from '../types/index.js';
export declare class MemoryUserRepository implements IUserRepository {
    private users;
    create(user: UserDoc): Promise<UserDoc>;
    getById(id: string): Promise<UserDoc | null>;
    update(user: UserDoc): Promise<UserDoc>;
    listAll(): Promise<UserDoc[]>;
    delete(id: string): Promise<void>;
}
export declare class MemorySessionRepository implements ISessionRepository {
    private sessions;
    create(session: SessionDoc): Promise<SessionDoc>;
    getById(id: string): Promise<SessionDoc | null>;
    delete(id: string): Promise<void>;
    deleteByUserId(userId: string): Promise<void>;
}
export declare class MemoryApiTokenRepository implements IApiTokenRepository {
    private tokens;
    create(token: ApiTokenDoc): Promise<ApiTokenDoc>;
    getById(id: string): Promise<ApiTokenDoc | null>;
    listByUserId(userId: string): Promise<ApiTokenDoc[]>;
    update(token: ApiTokenDoc): Promise<ApiTokenDoc>;
    delete(id: string): Promise<void>;
}
export declare class MemoryTodoRepository implements ITodoRepository {
    private todos;
    create(todo: TodoDoc): Promise<TodoDoc>;
    getById(id: string): Promise<TodoDoc | null>;
    listByUserId(userId: string): Promise<TodoDoc[]>;
    update(todo: TodoDoc): Promise<TodoDoc>;
    delete(id: string): Promise<void>;
    listAll(): Promise<TodoDoc[]>;
}
export declare class MemoryAppRepository implements IAppRepository {
    users: MemoryUserRepository;
    sessions: MemorySessionRepository;
    apiTokens: MemoryApiTokenRepository;
    todos: MemoryTodoRepository;
    init(): Promise<void>;
}
//# sourceMappingURL=memory.repository.d.ts.map
import { IAppRepository } from '../db/repository.interface.js';
import { TodoDoc, CreateTodoInput, UpdateTodoInput, SortBy, SortOrder } from '../types/index.js';
export declare class TodoService {
    private repo;
    constructor(repo: IAppRepository);
    create(userId: string, input: CreateTodoInput): Promise<TodoDoc>;
    list(userId: string, sortBy?: SortBy, order?: SortOrder): Promise<TodoDoc[]>;
    get(userId: string, id: string): Promise<TodoDoc | null>;
    update(userId: string, id: string, input: UpdateTodoInput): Promise<TodoDoc>;
    delete(userId: string, id: string): Promise<void>;
}
//# sourceMappingURL=todo.service.d.ts.map
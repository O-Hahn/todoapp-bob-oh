import crypto from 'node:crypto';
export class TodoService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async create(userId, input) {
        const todo = {
            _id: crypto.randomUUID(),
            userId,
            title: input.title.trim(),
            description: input.description?.trim() || '',
            createdAt: new Date().toISOString(),
            dueDate: input.dueDate || null,
            completed: false,
            type: 'todo',
        };
        return await this.repo.todos.create(todo);
    }
    async list(userId, sortBy = 'createdAt', order = 'desc') {
        const todos = await this.repo.todos.listByUserId(userId);
        const isAsc = order === 'asc';
        return todos.sort((a, b) => {
            if (sortBy === 'title') {
                const cmp = a.title.localeCompare(b.title, undefined, {
                    sensitivity: 'base',
                });
                return isAsc ? cmp : -cmp;
            }
            if (sortBy === 'dueDate') {
                const aHasDue = a.dueDate !== null && a.dueDate !== undefined && a.dueDate !== '';
                const bHasDue = b.dueDate !== null && b.dueDate !== undefined && b.dueDate !== '';
                // Todos without due date sort last regardless of order
                if (!aHasDue && !bHasDue)
                    return 0;
                if (!aHasDue)
                    return 1;
                if (!bHasDue)
                    return -1;
                const dateA = new Date(a.dueDate).getTime();
                const dateB = new Date(b.dueDate).getTime();
                return isAsc ? dateA - dateB : dateB - dateA;
            }
            // Default: createdAt
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return isAsc ? dateA - dateB : dateB - dateA;
        });
    }
    async get(userId, id) {
        const todo = await this.repo.todos.getById(id);
        if (!todo || todo.userId !== userId) {
            return null;
        }
        return todo;
    }
    async update(userId, id, input) {
        const todo = await this.get(userId, id);
        if (!todo) {
            const err = new Error('Todo not found');
            err.statusCode = 404;
            throw err;
        }
        if (input.title !== undefined) {
            todo.title = input.title.trim();
        }
        if (input.description !== undefined) {
            todo.description = input.description.trim();
        }
        if (input.dueDate !== undefined) {
            todo.dueDate = input.dueDate || null;
        }
        if (input.completed !== undefined) {
            todo.completed = input.completed;
        }
        return await this.repo.todos.update(todo);
    }
    async delete(userId, id) {
        const todo = await this.get(userId, id);
        if (!todo) {
            const err = new Error('Todo not found');
            err.statusCode = 404;
            throw err;
        }
        await this.repo.todos.delete(id, todo._rev);
    }
}
//# sourceMappingURL=todo.service.js.map
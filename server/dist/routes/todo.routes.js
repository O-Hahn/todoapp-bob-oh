import { createTodoSchema, updateTodoSchema, todoQuerySchema, } from '../schemas/index.js';
export function createTodoRoutes(todoService) {
    return async (fastify) => {
        fastify.addHook('preHandler', fastify.authenticate);
        fastify.get('/', async (request, reply) => {
            const parsed = todoQuerySchema.safeParse(request.query);
            if (!parsed.success) {
                return reply.status(400).send({
                    error: 'VALIDATION_ERROR',
                    message: parsed.error.issues[0].message,
                });
            }
            const todos = await todoService.list(request.user.id, parsed.data.sortBy, parsed.data.order);
            return reply.send({ todos });
        });
        fastify.post('/', async (request, reply) => {
            const parsed = createTodoSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({
                    error: 'VALIDATION_ERROR',
                    message: parsed.error.issues[0].message,
                });
            }
            const todo = await todoService.create(request.user.id, parsed.data);
            return reply.status(201).send({ todo });
        });
        fastify.get('/:id', async (request, reply) => {
            const { id } = request.params;
            const todo = await todoService.get(request.user.id, id);
            if (!todo) {
                return reply.status(404).send({
                    error: 'NOT_FOUND',
                    message: 'Todo item not found',
                });
            }
            return reply.send({ todo });
        });
        fastify.patch('/:id', async (request, reply) => {
            const { id } = request.params;
            const parsed = updateTodoSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({
                    error: 'VALIDATION_ERROR',
                    message: parsed.error.issues[0].message,
                });
            }
            try {
                const todo = await todoService.update(request.user.id, id, parsed.data);
                return reply.send({ todo });
            }
            catch (err) {
                if (err.statusCode === 404) {
                    return reply.status(404).send({
                        error: 'NOT_FOUND',
                        message: 'Todo item not found',
                    });
                }
                request.log.error(err, 'Update todo error');
                return reply.status(500).send({
                    error: 'INTERNAL_ERROR',
                    message: 'Unable to update todo',
                });
            }
        });
        fastify.delete('/:id', async (request, reply) => {
            const { id } = request.params;
            try {
                await todoService.delete(request.user.id, id);
                return reply.send({ message: 'Todo item deleted successfully' });
            }
            catch (err) {
                if (err.statusCode === 404) {
                    return reply.status(404).send({
                        error: 'NOT_FOUND',
                        message: 'Todo item not found',
                    });
                }
                request.log.error(err, 'Delete todo error');
                return reply.status(500).send({
                    error: 'INTERNAL_ERROR',
                    message: 'Unable to delete todo',
                });
            }
        });
    };
}
//# sourceMappingURL=todo.routes.js.map
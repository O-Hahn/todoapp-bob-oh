export function createAdminRoutes(adminService) {
    return async (fastify) => {
        fastify.addHook('preHandler', fastify.authenticate);
        fastify.addHook('preHandler', fastify.requireAdmin);
        fastify.get('/stats', async (request, reply) => {
            try {
                const stats = await adminService.getStats();
                return reply.send(stats);
            }
            catch (err) {
                request.log.error(err, 'Admin stats error');
                return reply.status(500).send({
                    error: 'INTERNAL_ERROR',
                    message: 'Unable to retrieve administration statistics',
                });
            }
        });
    };
}
//# sourceMappingURL=admin.routes.js.map
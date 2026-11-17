import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { AdminService } from '../services/admin.service.js';

export function createAdminRoutes(adminService: AdminService): FastifyPluginAsync {
  return async (fastify: FastifyInstance) => {
    fastify.addHook('preHandler', fastify.authenticate);
    fastify.addHook('preHandler', fastify.requireAdmin);

    fastify.get('/stats', async (request, reply) => {
      try {
        const stats = await adminService.getStats();
        return reply.send(stats);
      } catch (err: any) {
        request.log.error(err, 'Admin stats error');
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Unable to retrieve administration statistics',
        });
      }
    });
  };
}

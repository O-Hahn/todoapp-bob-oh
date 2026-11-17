import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { TokenService } from '../services/token.service.js';
import { createApiTokenSchema } from '../schemas/index.js';

export function createTokenRoutes(tokenService: TokenService): FastifyPluginAsync {
  return async (fastify: FastifyInstance) => {
    fastify.addHook('preHandler', fastify.authenticate);

    fastify.get('/', async (request, reply) => {
      const tokens = await tokenService.listTokens(request.user!.id);
      return reply.send({ tokens });
    });

    fastify.post('/', async (request, reply) => {
      const parsed = createApiTokenSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: parsed.error.issues[0].message,
        });
      }

      const token = await tokenService.createToken(
        request.user!.id,
        parsed.data.label,
      );
      return reply.status(201).send({ token });
    });

    fastify.delete('/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        await tokenService.revokeToken(request.user!.id, id);
        return reply.send({ message: 'Token revoked successfully' });
      } catch (err: any) {
        if (err.statusCode === 404) {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: 'Token not found',
          });
        }
        request.log.error(err, 'Revoke token error');
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Unable to revoke token',
        });
      }
    });
  };
}

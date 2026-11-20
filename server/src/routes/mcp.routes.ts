import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { TokenService } from '../services/token.service.js';
import { TodoService } from '../services/todo.service.js';
import { handleMcpHttpRequest } from '../mcp/index.js';

export function createMcpRoutes(
  tokenService: TokenService,
  todoService: TodoService,
): FastifyPluginAsync {
  return async (fastify: FastifyInstance) => {
    fastify.all('/', {
      config: {
        rateLimit: {
          max: 300,
          timeWindow: '1 minute',
          // All agent traffic arrives via the web proxy, so key by token, not IP
          keyGenerator: (req: { headers: { authorization?: string }; ip: string }) =>
            req.headers.authorization ?? req.ip,
        },
      },
    }, async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Bearer token required for MCP access',
        });
      }

      const token = authHeader.slice(7).trim();
      const user = await tokenService.validateToken(token);
      if (!user) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Invalid or revoked MCP bearer token',
        });
      }

      reply.hijack();
      await handleMcpHttpRequest(
        request.raw,
        reply.raw,
        request.body,
        todoService,
        user,
      );
    });
  };
}

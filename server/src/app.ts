import fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';
import { Config } from './config.js';
import { IAppRepository } from './db/repository.interface.js';
import { AuthService } from './services/auth.service.js';
import { TodoService } from './services/todo.service.js';
import { TokenService } from './services/token.service.js';
import { AdminService } from './services/admin.service.js';
import { authPlugin } from './auth/plugin.js';
import { createAuthRoutes } from './routes/auth.routes.js';
import { createTodoRoutes } from './routes/todo.routes.js';
import { createTokenRoutes } from './routes/token.routes.js';
import { createAdminRoutes } from './routes/admin.routes.js';
import { createMcpRoutes } from './routes/mcp.routes.js';

export async function buildApp(
  config: Config,
  repo: IAppRepository,
): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["set-cookie"]',
        'body.password',
        'body.currentPassword',
        'body.newPassword',
      ],
    },
  });

  // Global error handler that prevents leaking internals
  app.setErrorHandler((error: any, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode || 500;
    const message =
      statusCode < 500
        ? error.message
        : 'An internal server error occurred';

    reply.status(statusCode).send({
      error: error.name || 'Error',
      message,
    });
  });

  // Cookie parsing & signing
  await app.register(fastifyCookie, {
    secret: config.SESSION_SECRET,
    hook: 'onRequest',
  });

  // Global rate limit defaults
  await app.register(fastifyRateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
  });

  // CSRF defence for cookie-authenticated, state-changing requests: browsers always
  // send Origin on cross-site POST/PUT/PATCH/DELETE, so a mismatching Origin is rejected.
  // Requests without Origin (curl, server-to-server) are not browser CSRF vectors.
  app.addHook('onRequest', async (request, reply) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
    if (!request.url.startsWith('/api/')) return;
    const origin = request.headers.origin;
    if (!origin) return;
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    const forwardedHost = request.headers['x-forwarded-host'];
    const requestHost =
      (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ??
      request.headers.host;
    if (!originHost || originHost !== requestHost) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Cross-origin request rejected',
      });
    }
  });

  // Instantiate services
  const authService = new AuthService(repo);
  const todoService = new TodoService(repo);
  const tokenService = new TokenService(repo);
  const adminService = new AdminService(repo, config);

  // Register Auth Plugin
  await app.register(authPlugin, { authService });

  // Health endpoint
  app.get('/api/health', async () => {
    return {
      status: 'ok',
      version: '1.0.0',
      time: new Date().toISOString(),
    };
  });

  // API Routes
  await app.register(createAuthRoutes(authService, config), {
    prefix: '/api/auth',
  });
  await app.register(createTodoRoutes(todoService), {
    prefix: '/api/todos',
  });
  await app.register(createTokenRoutes(tokenService), {
    prefix: '/api/tokens',
  });
  await app.register(createAdminRoutes(adminService), {
    prefix: '/api/admin',
  });
  await app.register(createMcpRoutes(tokenService, todoService), {
    prefix: '/mcp',
  });

  return app;
}

import fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';
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
export async function buildApp(config, repo) {
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
    app.setErrorHandler((error, request, reply) => {
        request.log.error(error);
        const statusCode = error.statusCode || 500;
        const message = statusCode < 500
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
//# sourceMappingURL=app.js.map
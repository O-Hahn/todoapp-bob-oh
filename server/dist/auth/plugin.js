import fp from 'fastify-plugin';
const authPluginCallback = async (fastify, options) => {
    fastify.decorate('authService', options.authService);
    fastify.decorateRequest('user', null);
    fastify.decorate('authenticate', async (request, reply) => {
        const sessionToken = request.cookies.session_token;
        if (!sessionToken) {
            return reply.status(401).send({
                error: 'UNAUTHORIZED',
                message: 'Authentication required',
            });
        }
        const user = await options.authService.validateSession(sessionToken);
        if (!user) {
            reply.clearCookie('session_token', { path: '/' });
            return reply.status(401).send({
                error: 'UNAUTHORIZED',
                message: 'Session expired or invalid',
            });
        }
        request.user = user;
        // Force password change rule
        if (user.mustChangePassword &&
            !request.url.includes('/api/auth/change-password') &&
            !request.url.includes('/api/auth/logout') &&
            !request.url.includes('/api/auth/me')) {
            return reply.status(403).send({
                error: 'MUST_CHANGE_PASSWORD',
                message: 'Password change is required before accessing application resources',
            });
        }
    });
    fastify.decorate('requireAdmin', async (request, reply) => {
        if (!request.user || request.user.role !== 'admin') {
            return reply.status(403).send({
                error: 'FORBIDDEN',
                message: 'Admin privileges required',
            });
        }
    });
};
export const authPlugin = fp(authPluginCallback, {
    name: 'auth-plugin',
});
//# sourceMappingURL=plugin.js.map
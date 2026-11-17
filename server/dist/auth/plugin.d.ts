import { FastifyPluginAsync } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { AuthUser } from '../types/index.js';
declare module 'fastify' {
    interface FastifyRequest {
        user: AuthUser | null;
    }
    interface FastifyInstance {
        authService: AuthService;
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}
interface AuthPluginOptions {
    authService: AuthService;
}
export declare const authPlugin: FastifyPluginAsync<AuthPluginOptions>;
export {};
//# sourceMappingURL=plugin.d.ts.map
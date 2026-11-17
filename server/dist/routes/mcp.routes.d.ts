import { FastifyPluginAsync } from 'fastify';
import { TokenService } from '../services/token.service.js';
import { TodoService } from '../services/todo.service.js';
export declare function createMcpRoutes(tokenService: TokenService, todoService: TodoService): FastifyPluginAsync;
//# sourceMappingURL=mcp.routes.d.ts.map
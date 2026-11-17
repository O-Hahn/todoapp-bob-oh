import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TodoService } from '../services/todo.service.js';
import { AuthUser } from '../types/index.js';
export declare function createMcpServer(todoService: TodoService, user: AuthUser): McpServer;
export declare function handleMcpHttpRequest(req: any, res: any, parsedBody: any, todoService: TodoService, user: AuthUser): Promise<void>;
//# sourceMappingURL=index.d.ts.map
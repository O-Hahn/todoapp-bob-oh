import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { TodoService } from '../services/todo.service.js';
import { AuthUser } from '../types/index.js';

export function createMcpServer(todoService: TodoService, user: AuthUser): McpServer {
  const server = new McpServer({
    name: 'todo-mcp-server',
    version: '1.0.0',
  });

  server.tool(
    'list_todos',
    'List all todos for the authenticated user with optional sorting by due date, creation date, or title in ascending or descending order.',
    {
      sortBy: z
        .enum(['dueDate', 'createdAt', 'title'])
        .describe('Field to sort by: dueDate, createdAt, or title')
        .optional(),
      order: z
        .enum(['asc', 'desc'])
        .describe('Sort direction: asc for ascending, desc for descending')
        .optional(),
    },
    async (args) => {
      try {
        const todos = await todoService.list(user.id, args.sortBy, args.order);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(todos, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error listing todos: ${err.message}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    'get_todo',
    'Get details of a specific todo by its identifier.',
    {
      id: z.string().describe('The unique identifier of the todo'),
    },
    async (args) => {
      try {
        const todo = await todoService.get(user.id, args.id);
        if (!todo) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Todo with ID ${args.id} not found`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(todo, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error retrieving todo: ${err.message}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    'create_todo',
    'Create a new todo with a title, optional description, and optional ISO due date.',
    {
      title: z.string().min(1).max(200).describe('Title of the todo item'),
      description: z
        .string()
        .max(2000)
        .optional()
        .describe('Detailed description of the todo item'),
      dueDate: z
        .string()
        .optional()
        .describe('Optional due date in ISO 8601 format like 2026-12-31T23:59:59Z'),
    },
    async (args) => {
      try {
        const todo = await todoService.create(user.id, {
          title: args.title,
          description: args.description,
          dueDate: args.dueDate,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'Todo created successfully', todo },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error creating todo: ${err.message}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    'update_todo',
    'Update an existing todo title, description, due date, or completed status.',
    {
      id: z.string().describe('The unique identifier of the todo to update'),
      title: z.string().min(1).max(200).optional().describe('New title for the todo'),
      description: z
        .string()
        .max(2000)
        .optional()
        .describe('New description for the todo'),
      dueDate: z
        .string()
        .nullable()
        .optional()
        .describe('New ISO due date or null to clear due date'),
      completed: z
        .boolean()
        .optional()
        .describe('Set to true to mark completed, or false for open'),
    },
    async (args) => {
      try {
        const todo = await todoService.update(user.id, args.id, {
          title: args.title,
          description: args.description,
          dueDate: args.dueDate,
          completed: args.completed,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'Todo updated successfully', todo },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error updating todo: ${err.message}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    'delete_todo',
    'Delete a todo by its identifier.',
    {
      id: z.string().describe('The unique identifier of the todo to delete'),
    },
    async (args) => {
      try {
        await todoService.delete(user.id, args.id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: `Todo ${args.id} deleted successfully` },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error deleting todo: ${err.message}`,
            },
          ],
        };
      }
    },
  );

  return server;
}

export async function handleMcpHttpRequest(
  req: any,
  res: any,
  parsedBody: any,
  todoService: TodoService,
  user: AuthUser,
): Promise<void> {
  const mcpServer = createMcpServer(todoService, user);
  const transport = new StreamableHTTPServerTransport();

  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, parsedBody);
}

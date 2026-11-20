import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { MemoryAppRepository } from '../src/db/memory.repository.js';
import { TokenService } from '../src/services/token.service.js';
import { TodoService } from '../src/services/todo.service.js';
import { Config } from '../src/config.js';

const testConfig: Config = {
  PORT: 8080,
  HOST: '127.0.0.1',
  NODE_ENV: 'test',
  LOG_LEVEL: 'fatal',
  CLOUDANT_URL: 'http://127.0.0.1:5984',
  DB_USERS: 'test_users',
  DB_SESSIONS: 'test_sessions',
  DB_API_TOKENS: 'test_api_tokens',
  DB_TODOS: 'test_todos',
  SESSION_SECRET: 'test_secret_1234567890_1234567890',
  COOKIE_SECURE: false,
  ADMIN_EMAIL: 'admin@example.com',
  KUBERNETES_NAMESPACE: 'todo-app',
  ADMIN_SECRET_NAME: 'todo-admin-initial',
};

describe('API Tokens & MCP Streamable HTTP', () => {
  let app: any;
  let repo: MemoryAppRepository;
  let tokenService: TokenService;
  let todoService: TodoService;
  let userCookie: string;
  let userId: string;

  beforeEach(async () => {
    repo = new MemoryAppRepository();
    tokenService = new TokenService(repo);
    todoService = new TodoService(repo);
    app = await buildApp(testConfig, repo);

    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'agentuser@example.com', password: 'password123' },
    });
    userCookie = reg.headers['set-cookie'];
    userId = JSON.parse(reg.body).user.id;
  });

  it('allows user to create, list, and revoke API tokens', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/tokens',
      headers: { cookie: userCookie },
      payload: { label: 'My Agent Token' },
    });

    expect(createRes.statusCode).toBe(201);
    const { token } = JSON.parse(createRes.body);
    expect(token.label).toBe('My Agent Token');
    expect(token.token).toMatch(/^todo_mcp_/);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/tokens',
      headers: { cookie: userCookie },
    });
    expect(listRes.statusCode).toBe(200);
    const tokens = JSON.parse(listRes.body).tokens;
    expect(tokens).toHaveLength(1);
    expect(tokens[0].label).toBe('My Agent Token');

    // Revoke
    const revokeRes = await app.inject({
      method: 'DELETE',
      url: `/api/tokens/${token.id}`,
      headers: { cookie: userCookie },
    });
    expect(revokeRes.statusCode).toBe(200);

    // List again -> empty
    const listAgain = await app.inject({
      method: 'GET',
      url: '/api/tokens',
      headers: { cookie: userCookie },
    });
    expect(JSON.parse(listAgain.body).tokens).toHaveLength(0);
  });

  it('rejects /mcp calls without or with invalid Bearer token', async () => {
    const noAuth = await app.inject({
      method: 'POST',
      url: '/mcp',
      payload: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });
    expect(noAuth.statusCode).toBe(401);

    const badAuth = await app.inject({
      method: 'POST',
      url: '/mcp',
      headers: { authorization: 'Bearer invalid_token' },
      payload: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });
    expect(badAuth.statusCode).toBe(401);
  });

  it('authenticates valid token and validates token service', async () => {
    const created = await tokenService.createToken(userId, 'Agent Test');
    const authUser = await tokenService.validateToken(created.token);
    expect(authUser).toBeDefined();
    expect(authUser?.email).toBe('agentuser@example.com');
  });

  it('serves tools/list and tools/call over Streamable HTTP with zod schemas', async () => {
    const created = await tokenService.createToken(userId, 'Agent Test');
    const headers = {
      authorization: `Bearer ${created.token}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    };

    const list = await app.inject({
      method: 'POST',
      url: '/mcp',
      headers,
      payload: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });
    expect(list.statusCode).toBe(200);
    expect(list.body).toContain('create_todo');

    const call = await app.inject({
      method: 'POST',
      url: '/mcp',
      headers,
      payload: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'create_todo', arguments: { title: 'From MCP' } },
      },
    });
    expect(call.statusCode).toBe(200);
    expect(call.body).toContain('From MCP');
  });
});

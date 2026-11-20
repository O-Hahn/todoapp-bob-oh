import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { MemoryAppRepository } from '../src/db/memory.repository.js';
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

describe('CSRF Origin check', () => {
  let app: any;

  beforeEach(async () => {
    app = await buildApp(testConfig, new MemoryAppRepository());
  });

  it('rejects state-changing requests from a foreign Origin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      headers: { origin: 'https://evil.example.net', host: 'todo.example.com' },
      payload: { email: 'csrf@example.com', password: 'password123' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('allows same-origin requests and requests without Origin', async () => {
    const sameOrigin = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      headers: { origin: 'https://todo.example.com', host: 'todo.example.com' },
      payload: { email: 'same@example.com', password: 'password123' },
    });
    expect(sameOrigin.statusCode).toBe(201);

    const noOrigin = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'noorigin@example.com', password: 'password123' },
    });
    expect(noOrigin.statusCode).toBe(201);
  });
});

describe('/mcp rate limit', () => {
  it('returns 429 after exceeding the per-token limit', async () => {
    const app = await buildApp(testConfig, new MemoryAppRepository());
    let last = 0;
    for (let i = 0; i < 305; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/mcp',
        headers: { authorization: 'Bearer invalid_token' },
        payload: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
      });
      last = res.statusCode;
    }
    expect(last).toBe(429);
  });
});

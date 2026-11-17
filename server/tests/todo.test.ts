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

describe('Todo API', () => {
  let app: any;
  let repo: MemoryAppRepository;
  let user1Cookie: string;
  let user2Cookie: string;

  beforeEach(async () => {
    repo = new MemoryAppRepository();
    app = await buildApp(testConfig, repo);

    const reg1 = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'user1@example.com', password: 'password123' },
    });
    user1Cookie = reg1.headers['set-cookie'];

    const reg2 = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'user2@example.com', password: 'password123' },
    });
    user2Cookie = reg2.headers['set-cookie'];
  });

  it('creates, reads, updates, and deletes a todo item', async () => {
    // Create
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/todos',
      headers: { cookie: user1Cookie },
      payload: {
        title: 'Buy Groceries',
        description: 'Milk, Eggs, Bread',
        dueDate: '2026-12-01T12:00:00Z',
      },
    });
    expect(createRes.statusCode).toBe(201);
    const todo = JSON.parse(createRes.body).todo;
    expect(todo.title).toBe('Buy Groceries');
    expect(todo.completed).toBe(false);

    // Read by id
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/todos/${todo._id}`,
      headers: { cookie: user1Cookie },
    });
    expect(getRes.statusCode).toBe(200);
    expect(JSON.parse(getRes.body).todo.title).toBe('Buy Groceries');

    // Update completed flag
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/todos/${todo._id}`,
      headers: { cookie: user1Cookie },
      payload: { completed: true },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(JSON.parse(patchRes.body).todo.completed).toBe(true);

    // Delete
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/todos/${todo._id}`,
      headers: { cookie: user1Cookie },
    });
    expect(deleteRes.statusCode).toBe(200);

    // Verify deleted
    const verifyGet = await app.inject({
      method: 'GET',
      url: `/api/todos/${todo._id}`,
      headers: { cookie: user1Cookie },
    });
    expect(verifyGet.statusCode).toBe(404);
  });

  it('enforces user ownership isolation', async () => {
    // User 1 creates todo
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/todos',
      headers: { cookie: user1Cookie },
      payload: { title: 'User 1 Secret Task' },
    });
    const todoId = JSON.parse(createRes.body).todo._id;

    // User 2 attempts to get User 1's todo -> 404
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/todos/${todoId}`,
      headers: { cookie: user2Cookie },
    });
    expect(getRes.statusCode).toBe(404);

    // User 2 attempts to patch User 1's todo -> 404
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/todos/${todoId}`,
      headers: { cookie: user2Cookie },
      payload: { title: 'Hacked' },
    });
    expect(patchRes.statusCode).toBe(404);

    // User 2 list should be empty
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/todos',
      headers: { cookie: user2Cookie },
    });
    expect(JSON.parse(listRes.body).todos).toHaveLength(0);
  });

  it('correctly sorts todos including due date sorting with nulls last', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/todos',
      headers: { cookie: user1Cookie },
      payload: { title: 'Task B - Due Later', dueDate: '2026-12-10T00:00:00Z' },
    });

    await app.inject({
      method: 'POST',
      url: '/api/todos',
      headers: { cookie: user1Cookie },
      payload: { title: 'Task A - Due Soon', dueDate: '2026-11-20T00:00:00Z' },
    });

    await app.inject({
      method: 'POST',
      url: '/api/todos',
      headers: { cookie: user1Cookie },
      payload: { title: 'Task C - No Due Date', dueDate: null },
    });

    // Sort by dueDate asc
    const dueAscRes = await app.inject({
      method: 'GET',
      url: '/api/todos?sortBy=dueDate&order=asc',
      headers: { cookie: user1Cookie },
    });
    const dueAsc = JSON.parse(dueAscRes.body).todos;
    expect(dueAsc[0].title).toBe('Task A - Due Soon');
    expect(dueAsc[1].title).toBe('Task B - Due Later');
    expect(dueAsc[2].title).toBe('Task C - No Due Date');

    // Sort by dueDate desc -> non-due date should STILL be last!
    const dueDescRes = await app.inject({
      method: 'GET',
      url: '/api/todos?sortBy=dueDate&order=desc',
      headers: { cookie: user1Cookie },
    });
    const dueDesc = JSON.parse(dueDescRes.body).todos;
    expect(dueDesc[0].title).toBe('Task B - Due Later');
    expect(dueDesc[1].title).toBe('Task A - Due Soon');
    expect(dueDesc[2].title).toBe('Task C - No Due Date');

    // Sort by title asc
    const titleAscRes = await app.inject({
      method: 'GET',
      url: '/api/todos?sortBy=title&order=asc',
      headers: { cookie: user1Cookie },
    });
    const titleAsc = JSON.parse(titleAscRes.body).todos;
    expect(titleAsc[0].title).toBe('Task A - Due Soon');
    expect(titleAsc[1].title).toBe('Task B - Due Later');
    expect(titleAsc[2].title).toBe('Task C - No Due Date');
  });
});

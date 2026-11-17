import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { MemoryAppRepository } from '../src/db/memory.repository.js';
import { AdminService } from '../src/services/admin.service.js';
import { Config } from '../src/config.js';
import { getUserDocId } from '../src/auth/crypto.js';

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

describe('Admin Service & Routes', () => {
  let app: any;
  let repo: MemoryAppRepository;
  let adminService: AdminService;

  beforeEach(async () => {
    repo = new MemoryAppRepository();
    adminService = new AdminService(repo, testConfig);
    await adminService.bootstrapAdmin();
    app = await buildApp(testConfig, repo);
  });

  it('bootstraps default admin user with mustChangePassword = true', async () => {
    const adminDoc = await repo.users.getById(getUserDocId('admin@example.com'));
    expect(adminDoc).toBeDefined();
    expect(adminDoc?.role).toBe('admin');
    expect(adminDoc?.mustChangePassword).toBe(true);
  });

  it('rejects regular user from accessing /api/admin/stats', async () => {
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'regular@example.com', password: 'password123' },
    });
    const cookie = regRes.headers['set-cookie'];

    const adminStatsRes = await app.inject({
      method: 'GET',
      url: '/api/admin/stats',
      headers: { cookie },
    });

    expect(adminStatsRes.statusCode).toBe(403);
  });

  it('computes correct user and todo statistics', async () => {
    // Register user 1
    const reg1 = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'client1@example.com', password: 'password123' },
    });
    const cookie1 = reg1.headers['set-cookie'];

    // Create 1 completed, 1 open non-overdue, 1 overdue todo
    await app.inject({
      method: 'POST',
      url: '/api/todos',
      headers: { cookie: cookie1 },
      payload: { title: 'Done Task' },
    });
    const todosRes = await app.inject({
      method: 'GET',
      url: '/api/todos',
      headers: { cookie: cookie1 },
    });
    const todoId = JSON.parse(todosRes.body).todos[0]._id;
    await app.inject({
      method: 'PATCH',
      url: `/api/todos/${todoId}`,
      headers: { cookie: cookie1 },
      payload: { completed: true },
    });

    await app.inject({
      method: 'POST',
      url: '/api/todos',
      headers: { cookie: cookie1 },
      payload: { title: 'Future Open Task', dueDate: '2099-01-01T00:00:00Z' },
    });

    await app.inject({
      method: 'POST',
      url: '/api/todos',
      headers: { cookie: cookie1 },
      payload: { title: 'Overdue Task', dueDate: '2020-01-01T00:00:00Z' },
    });

    // Get stats from admin service
    const stats = await adminService.getStats();
    expect(stats.totalUsers).toBe(1);
    expect(stats.users[0].email).toBe('client1@example.com');
    expect(stats.users[0].total).toBe(3);
    expect(stats.users[0].done).toBe(1);
    expect(stats.users[0].open).toBe(2);
    expect(stats.users[0].overdue).toBe(1);
  });
});

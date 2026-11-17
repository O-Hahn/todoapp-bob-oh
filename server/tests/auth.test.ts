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

describe('Auth API', () => {
  let app: any;
  let repo: MemoryAppRepository;

  beforeEach(async () => {
    repo = new MemoryAppRepository();
    app = await buildApp(testConfig, repo);
  });

  it('registers a new user and sets session cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'user@example.com',
        password: 'password123',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.user.email).toBe('user@example.com');
    expect(body.user.role).toBe('user');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects duplicate email registration', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'user@example.com',
        password: 'password123',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'USER@example.com', // case insensitive duplicate
        password: 'anotherpassword',
      },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('EMAIL_EXISTS');
  });

  it('logs in an existing user with valid password and rejects invalid', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'correctpassword',
      },
    });

    // Wrong password
    const failRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'wrongpassword',
      },
    });
    expect(failRes.statusCode).toBe(401);

    // Correct password
    const successRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'correctpassword',
      },
    });
    expect(successRes.statusCode).toBe(200);
    const body = JSON.parse(successRes.body);
    expect(body.user.email).toBe('test@example.com');
  });

  it('protects /api/auth/me and handles logout', async () => {
    // Unauthenticated
    const unauth = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });
    expect(unauth.statusCode).toBe(401);

    // Register & get cookie
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'me@example.com',
        password: 'password123',
      },
    });
    const cookie = reg.headers['set-cookie'];

    // Authenticated
    const auth = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie },
    });
    expect(auth.statusCode).toBe(200);
    expect(JSON.parse(auth.body).user.email).toBe('me@example.com');

    // Logout
    const logout = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie },
    });
    expect(logout.statusCode).toBe(200);

    // Check me again -> 401
    const postLogout = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie },
    });
    expect(postLogout.statusCode).toBe(401);
  });
});

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('127.0.0.1'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),

  // Cloudant / CouchDB
  CLOUDANT_URL: z.string().url().default('http://127.0.0.1:5984'),
  CLOUDANT_APIKEY: z.string().optional(),
  CLOUDANT_USERNAME: z.string().optional(),
  CLOUDANT_PASSWORD: z.string().optional(),

  // DB names
  DB_USERS: z.string().default('todo_users'),
  DB_SESSIONS: z.string().default('todo_sessions'),
  DB_API_TOKENS: z.string().default('todo_api_tokens'),
  DB_TODOS: z.string().default('todo_todos'),

  // Session & Security
  SESSION_SECRET: z.string().min(16).default('development_insecure_session_secret_32_bytes_long'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  // Administration
  ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  KUBERNETES_NAMESPACE: z.string().default('todo-app'),
  ADMIN_SECRET_NAME: z.string().default('todo-admin-initial'),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    const errorMessages = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new Error(`Configuration validation error: ${errorMessages}`);
  }
  return result.data;
}

export const config = loadConfig();

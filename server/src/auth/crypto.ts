import crypto from 'node:crypto';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateAdminPassword(): string {
  return crypto.randomBytes(18).toString('base64url');
}

export function getUserDocId(email: string): string {
  return `user:${normalizeEmail(email)}`;
}

export function getSessionDocId(token: string): string {
  return `session:${hashToken(token)}`;
}

export function getTokenDocId(token: string): string {
  return `token:${hashToken(token)}`;
}

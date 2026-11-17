import { ApiTokenItem, CreatedApiToken } from '../types/index.js';
import { fetchJson } from './client.js';

export async function fetchApiTokens(): Promise<ApiTokenItem[]> {
  const res = await fetchJson<{ tokens: ApiTokenItem[] }>('/api/tokens');
  return res.tokens;
}

export async function createApiToken(label: string): Promise<CreatedApiToken> {
  const res = await fetchJson<{ token: CreatedApiToken }>('/api/tokens', {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
  return res.token;
}

export async function revokeApiToken(id: string): Promise<void> {
  await fetchJson(`/api/tokens/${id}`, {
    method: 'DELETE',
  });
}

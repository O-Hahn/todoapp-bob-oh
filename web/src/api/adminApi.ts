import { AdminStatsResponse } from '../types/index.js';
import { fetchJson } from './client.js';

export async function fetchAdminStats(): Promise<AdminStatsResponse> {
  return await fetchJson<AdminStatsResponse>('/api/admin/stats');
}

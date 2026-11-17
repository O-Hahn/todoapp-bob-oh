export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface TodoItem {
  _id: string;
  _rev?: string;
  userId: string;
  title: string;
  description?: string;
  createdAt: string;
  dueDate?: string | null;
  completed: boolean;
}

export type SortBy = 'dueDate' | 'createdAt' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface CreateTodoInput {
  title: string;
  description?: string;
  dueDate?: string | null;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  dueDate?: string | null;
  completed?: boolean;
}

export interface ApiTokenItem {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreatedApiToken extends ApiTokenItem {
  token: string;
}

export interface UserStats {
  userId: string;
  email: string;
  total: number;
  done: number;
  open: number;
  overdue: number;
}

export interface AdminStatsResponse {
  totalUsers: number;
  users: UserStats[];
}

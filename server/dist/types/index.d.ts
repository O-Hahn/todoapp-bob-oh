export type UserRole = 'user' | 'admin';
export interface UserDoc {
    _id: string;
    _rev?: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    mustChangePassword: boolean;
    createdAt: string;
    type: 'user';
}
export interface SessionDoc {
    _id: string;
    _rev?: string;
    userId: string;
    userEmail: string;
    userRole: UserRole;
    mustChangePassword: boolean;
    expiresAt: string;
    createdAt: string;
    type: 'session';
}
export interface ApiTokenDoc {
    _id: string;
    _rev?: string;
    userId: string;
    label: string;
    tokenHash: string;
    createdAt: string;
    lastUsedAt?: string;
    revoked: boolean;
    type: 'api_token';
}
export interface TodoDoc {
    _id: string;
    _rev?: string;
    userId: string;
    title: string;
    description?: string;
    createdAt: string;
    dueDate?: string | null;
    completed: boolean;
    type: 'todo';
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
export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    mustChangePassword: boolean;
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
//# sourceMappingURL=index.d.ts.map
import { UserDoc, SessionDoc, ApiTokenDoc, TodoDoc } from '../types/index.js';

export interface IUserRepository {
  create(user: UserDoc): Promise<UserDoc>;
  getById(id: string): Promise<UserDoc | null>;
  update(user: UserDoc): Promise<UserDoc>;
  listAll(): Promise<UserDoc[]>;
  delete(id: string, rev?: string): Promise<void>;
}

export interface ISessionRepository {
  create(session: SessionDoc): Promise<SessionDoc>;
  getById(id: string): Promise<SessionDoc | null>;
  delete(id: string, rev?: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

export interface IApiTokenRepository {
  create(token: ApiTokenDoc): Promise<ApiTokenDoc>;
  getById(id: string): Promise<ApiTokenDoc | null>;
  listByUserId(userId: string): Promise<ApiTokenDoc[]>;
  update(token: ApiTokenDoc): Promise<ApiTokenDoc>;
  delete(id: string, rev?: string): Promise<void>;
}

export interface ITodoRepository {
  create(todo: TodoDoc): Promise<TodoDoc>;
  getById(id: string): Promise<TodoDoc | null>;
  listByUserId(userId: string): Promise<TodoDoc[]>;
  update(todo: TodoDoc): Promise<TodoDoc>;
  delete(id: string, rev?: string): Promise<void>;
  listAll(): Promise<TodoDoc[]>;
}

export interface IAppRepository {
  users: IUserRepository;
  sessions: ISessionRepository;
  apiTokens: IApiTokenRepository;
  todos: ITodoRepository;
  init(): Promise<void>;
}

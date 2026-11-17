import {
  TodoItem,
  CreateTodoInput,
  UpdateTodoInput,
  SortBy,
  SortOrder,
} from '../types/index.js';
import { fetchJson } from './client.js';

export async function fetchTodos(
  sortBy: SortBy = 'createdAt',
  order: SortOrder = 'desc',
): Promise<TodoItem[]> {
  const query = new URLSearchParams({ sortBy, order }).toString();
  const res = await fetchJson<{ todos: TodoItem[] }>(`/api/todos?${query}`);
  return res.todos;
}

export async function createTodo(input: CreateTodoInput): Promise<TodoItem> {
  const res = await fetchJson<{ todo: TodoItem }>('/api/todos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.todo;
}

export async function updateTodo(
  id: string,
  input: UpdateTodoInput,
): Promise<TodoItem> {
  const res = await fetchJson<{ todo: TodoItem }>(`/api/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return res.todo;
}

export async function deleteTodo(id: string): Promise<void> {
  await fetchJson(`/api/todos/${id}`, {
    method: 'DELETE',
  });
}

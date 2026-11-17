import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
});

export const createTodoSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional().default(''),
  dueDate: z
    .string()
    .trim()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid ISO date format',
    })
    .nullable()
    .optional(),
});

export const updateTodoSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters').optional(),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional(),
  dueDate: z
    .string()
    .trim()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid ISO date format',
    })
    .nullable()
    .optional(),
  completed: z.boolean().optional(),
});

export const todoQuerySchema = z.object({
  sortBy: z.enum(['dueDate', 'createdAt', 'title']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const createApiTokenSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(100, 'Label cannot exceed 100 characters'),
});

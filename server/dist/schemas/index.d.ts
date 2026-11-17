import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const changePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
}>;
export declare const createTodoSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    dueDate: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    dueDate?: string | null | undefined;
}, {
    title: string;
    dueDate?: string | null | undefined;
    description?: string | undefined;
}>;
export declare const updateTodoSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
    completed: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dueDate?: string | null | undefined;
    title?: string | undefined;
    description?: string | undefined;
    completed?: boolean | undefined;
}, {
    dueDate?: string | null | undefined;
    title?: string | undefined;
    description?: string | undefined;
    completed?: boolean | undefined;
}>;
export declare const todoQuerySchema: z.ZodObject<{
    sortBy: z.ZodDefault<z.ZodEnum<["dueDate", "createdAt", "title"]>>;
    order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    sortBy: "dueDate" | "createdAt" | "title";
    order: "asc" | "desc";
}, {
    sortBy?: "dueDate" | "createdAt" | "title" | undefined;
    order?: "asc" | "desc" | undefined;
}>;
export declare const createApiTokenSchema: z.ZodObject<{
    label: z.ZodString;
}, "strip", z.ZodTypeAny, {
    label: string;
}, {
    label: string;
}>;
//# sourceMappingURL=index.d.ts.map
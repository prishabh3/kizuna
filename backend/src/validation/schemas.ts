import { z } from "zod";

// ── User Schemas ──────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
    department: z.string().min(1, "Department is required").max(100),
});

export const updateUserSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).optional(),
    department: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

// ── Task Schemas ──────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(2000).optional().default(""),
    status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).default("TODO"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
    assignee: z.string().max(100).optional().default("Unassigned"),
    dueDate: z.string().datetime().optional().nullable(),
    tags: z.array(z.string()).optional().default([]),
});

export const updateTaskStatusSchema = z.object({
    status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]),
});

// ── Agent Schemas ─────────────────────────────────────────────────────────────

export const parseDocsSchema = z.object({
    rawText: z.string().min(10, "Please provide at least 10 characters of documentation"),
    sourceLanguage: z.enum(["auto", "text"]).default("auto"),
});

// ── Pagination ────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// ── Validation middleware factory ─────────────────────────────────────────────
import { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export const validate =
    (schema: ZodSchema, source: "body" | "query" | "params" = "body") =>
        (req: Request, res: Response, next: NextFunction): void => {
            const result = schema.safeParse(req[source]);
            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: "Validation failed",
                    code: 400,
                    details: result.error.errors.map((e) => ({
                        field: e.path.join("."),
                        message: e.message,
                    })),
                });
                return;
            }
            req[source] = result.data;
            next();
        };

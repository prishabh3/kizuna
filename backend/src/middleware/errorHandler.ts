import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
    statusCode?: number;
    code?: number;
    details?: unknown;
}

/**
 * Centralized global error handler.
 * All thrown errors flow here - returns consistent JSON error format.
 * Must be registered LAST in the Express middleware chain.
 */
export const globalErrorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
): void => {
    const statusCode = err.statusCode || err.code || 500;
    const message = err.message || "Internal Server Error";

    // Log full error in development
    if (process.env.NODE_ENV === "development") {
        console.error(`[ERROR] ${req.method} ${req.path}:`, err);
    } else {
        // In production, only log the message (no stack traces to client)
        console.error(`[ERROR] ${req.method} ${req.path}: ${message}`);
    }

    res.status(statusCode).json({
        success: false,
        error: message,
        code: statusCode,
        ...(process.env.NODE_ENV === "development" && err.details
            ? { details: err.details }
            : {}),
        ...(process.env.NODE_ENV === "development" && err.stack
            ? { stack: err.stack }
            : {}),
    });
};

/**
 * Helper to create typed errors with status codes.
 * Usage: throw createError(404, 'User not found')
 */
export const createError = (
    statusCode: number,
    message: string,
    details?: unknown
): AppError => {
    const error: AppError = new Error(message);
    error.statusCode = statusCode;
    error.details = details;
    return error;
};

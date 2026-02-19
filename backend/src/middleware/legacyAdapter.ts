import { Request, Response, NextFunction } from "express";
import { ILegacyTask } from "../models/LegacyTask";
import { NormalizedTask, TaskStatus, TaskPriority } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Legacy Adapter Middleware — The heart of the Strangler Fig pattern.
//
// Raw MongoDB documents arrive with inconsistent keys, mixed Japanese/English
// fields, and ambiguous status codes. This middleware normalizes them into
// clean `NormalizedTask` objects before they reach the frontend.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the title from one of several possible legacy field names.
 */
function resolveTitle(raw: ILegacyTask): string {
    return (
        raw.title ||
        raw.name ||
        raw.task_name ||
        "Untitled Task"
    );
}

/**
 * Resolves the description.
 */
function resolveDescription(raw: ILegacyTask): string {
    return raw.desc || raw.description || "";
}

/**
 * Maps disparate status values to our normalized TaskStatus enum.
 * Examples: "todo"→TODO, "進行中"→IN_PROGRESS, "2"→IN_PROGRESS, 3→REVIEW
 */
function resolveStatus(raw: ILegacyTask): TaskStatus {
    const s = String(raw.status || "").toLowerCase().trim();
    const statusMap: Record<string, TaskStatus> = {
        "todo": "TODO",
        "backlog": "TODO",
        "0": "TODO",
        "open": "TODO",
        "in_progress": "IN_PROGRESS",
        "in progress": "IN_PROGRESS",
        "active": "IN_PROGRESS",
        "wip": "IN_PROGRESS",
        "1": "IN_PROGRESS",
        "doing": "IN_PROGRESS",
        "review": "REVIEW",
        "pending": "REVIEW",
        "2": "REVIEW",
        "in_review": "REVIEW",
        "done": "DONE",
        "completed": "DONE",
        "3": "DONE",
        "closed": "DONE",
        "finished": "DONE",
    };
    return statusMap[s] || "TODO";
}

/**
 * Maps disparate priority values to our normalized TaskPriority enum.
 */
function resolvePriority(raw: ILegacyTask): TaskPriority {
    const p = String(raw.priority || "").toLowerCase().trim();
    const priorityMap: Record<string, TaskPriority> = {
        "low": "LOW",
        "minor": "LOW",
        "1": "LOW",
        "medium": "MEDIUM",
        "mid": "MEDIUM",
        "normal": "MEDIUM",
        "2": "MEDIUM",
        "high": "HIGH",
        "major": "HIGH",
        "3": "HIGH",
        "critical": "CRITICAL",
        "blocker": "CRITICAL",
        "4": "CRITICAL",
        "urgent": "CRITICAL",
    };
    return priorityMap[p] || "MEDIUM";
}

/**
 * Resolves assignee from one of several possible field names.
 */
function resolveAssignee(raw: ILegacyTask): string {
    return raw.assignee || raw.owner || raw.member || "Unassigned";
}

/**
 * Resolves due date from one of several possible field names.
 */
function resolveDueDate(raw: ILegacyTask): string | null {
    const raw_date = raw.due || raw.due_date || raw.deadline || null;
    if (!raw_date) return null;
    try {
        return new Date(raw_date).toISOString();
    } catch {
        return raw_date;
    }
}

/**
 * Normalizes the tags field - could be a string, array, or CSV.
 */
function resolveTags(raw: ILegacyTask): string[] {
    if (!raw.tags) return [];
    if (Array.isArray(raw.tags)) return raw.tags;
    return String(raw.tags)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
}

/**
 * Core normalization function — converts one raw legacy task to NormalizedTask.
 */
export function normalizeTask(raw: ILegacyTask): NormalizedTask {
    return {
        id: String((raw as any)._id),
        title: resolveTitle(raw),
        description: resolveDescription(raw),
        status: resolveStatus(raw),
        priority: resolvePriority(raw),
        assignee: resolveAssignee(raw),
        dueDate: resolveDueDate(raw),
        tags: resolveTags(raw),
        normalizedAt: new Date().toISOString(),
    };
}

/**
 * Express middleware that normalizes res.locals.rawTasks
 * and attaches the result to res.locals.tasks.
 * Use AFTER fetching raw tasks from MongoDB.
 */
export const legacyAdapterMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // If there are raw tasks in res.locals, normalize them
    if (res.locals.rawTasks) {
        try {
            res.locals.tasks = (res.locals.rawTasks as ILegacyTask[]).map(
                normalizeTask
            );
        } catch (err) {
            return next(err);
        }
    }
    next();
};

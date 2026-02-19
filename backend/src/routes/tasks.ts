import { Router, Request, Response } from "express";
import { LegacyTask } from "../models/LegacyTask";
import { AuditLog } from "../models/AuditLog";
import { authenticate, AuthRequest } from "../middleware/auth";
import { legacyAdapterMiddleware, normalizeTask } from "../middleware/legacyAdapter";
import { validate, createTaskSchema, updateTaskStatusSchema } from "../validation/schemas";
import { createError } from "../middleware/errorHandler";

const router = Router();

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all normalized tasks (passes through Legacy Adapter)
 *     tags: [Tasks]
 *     description: |
 *       Fetches raw legacy tasks from MongoDB and passes them through the
 *       Strangler Fig adapter middleware, which normalizes inconsistent
 *       legacy fields into a clean TypeScript-typed response.
 *     responses:
 *       200:
 *         description: Normalized tasks grouped by status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NormalizedTask'
 */
router.get(
    "/",
    authenticate,
    async (req: AuthRequest, res: Response, next) => {
        try {
            const rawTasks = await LegacyTask.find().sort({ createdAt: -1 }).limit(50);
            res.locals.rawTasks = rawTasks;
            next();
        } catch (err) {
            next(err);
        }
    },
    legacyAdapterMiddleware,
    (req: Request, res: Response) => {
        res.json({
            success: true,
            data: res.locals.tasks,
            meta: { total: res.locals.tasks.length },
        });
    }
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a single normalized task
 *     tags: [Tasks]
 */
router.get("/:id", authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const task = await LegacyTask.findById(req.params.id);
        if (!task) throw createError(404, "Task not found");

        res.json({ success: true, data: normalizeTask(task) });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NormalizedTask'
 *     responses:
 *       201:
 *         description: Task created
 */
router.post(
    "/",
    authenticate,
    validate(createTaskSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const task = await LegacyTask.create({
                title: req.body.title,
                desc: req.body.description,
                status: req.body.status.toLowerCase(),
                priority: req.body.priority.toLowerCase(),
                assignee: req.body.assignee,
                due_date: req.body.dueDate,
                tags: req.body.tags,
            });

            await AuditLog.create({
                action: "TASK_CREATED",
                actorId: req.user!.id,
                actorEmail: req.user!.email,
                targetType: "Task",
                targetId: String(task._id),
                details: { title: req.body.title },
            });

            res.status(201).json({ success: true, data: normalizeTask(task) });
        } catch (err) {
            next(err);
        }
    }
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   patch:
 *     summary: Update task status (e.g., from Kanban drag & drop)
 *     tags: [Tasks]
 */
router.patch(
    "/:id",
    authenticate,
    validate(updateTaskStatusSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const task = await LegacyTask.findById(req.params.id);
            if (!task) throw createError(404, "Task not found");

            const previousStatus = task.status;
            task.status = req.body.status.toLowerCase();
            await task.save();

            await AuditLog.create({
                action: "TASK_STATUS_UPDATED",
                actorId: req.user!.id,
                actorEmail: req.user!.email,
                targetType: "Task",
                targetId: String(task._id),
                details: { from: previousStatus, to: req.body.status },
            });

            res.json({ success: true, data: normalizeTask(task) });
        } catch (err) {
            next(err);
        }
    }
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 */
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const task = await LegacyTask.findByIdAndDelete(req.params.id);
        if (!task) throw createError(404, "Task not found");

        await AuditLog.create({
            action: "TASK_DELETED",
            actorId: req.user!.id,
            actorEmail: req.user!.email,
            targetType: "Task",
            targetId: req.params.id,
            details: {},
        });

        res.json({ success: true, data: { id: req.params.id } });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /api/tasks/seed/legacy:
 *   post:
 *     summary: Seed sample legacy tasks (dev only)
 *     tags: [Tasks]
 *     description: Seeds MongoDB with messy legacy task data to demonstrate the Strangler Fig adapter
 */
router.post("/seed/legacy", authenticate, async (_req, res, next) => {
    try {
        const sampleLegacyTasks = [
            {
                title: "Auth API Implementation",
                desc: "Build JWT-based user authentication system",
                status: "in-progress",
                priority: "high",
                assignee: "James Rodriguez",
                due_date: "2024-04-15",
                tags: ["backend", "security", "API"],
                legacy_ref: "JIRA-001",
            },
            {
                task_name: "Schema Design Review",
                desc: "Review the new database schema design document",
                status: "todo",
                priority: "2",
                assignee: "Priya Sharma",
                due_date: "2024-04-20",
                tags: "design,review",
                sys_id: "SYS-A042",
            },
            {
                title: "Frontend Dashboard UI",
                desc: "Build the main HR dashboard with metrics cards",
                status: "2",
                priority: "high",
                assignee: "Chen Wei",
                due: "2024-04-30",
                tags: ["frontend", "react", "dashboard"],
            },
            {
                title: "Kanban Board Integration",
                desc: "Integrate dnd-kit for drag and drop functionality",
                status: "done",
                priority: "medium",
                assignee: "Marco Rossi",
                due_date: "2024-03-31",
                tags: ["frontend", "kanban"],
            },
            {
                task_name: "Database Migration Script",
                desc: "Write script to migrate legacy data into the new MySQL schema",
                status: "done",
                priority: "critical",
                assignee: "Hiroshi Tanaka",
                due_date: "2024-03-25",
                tags: ["database", "migration", "ops"],
                raw_json: { old_system_ref: "LEGACY-DB-042", batch: "batch_3" },
            },
            {
                task_name: "Multi-language Support Removal",
                desc: "Remove i18n layer and standardise on English-only routing",
                status: "review",
                priority: "low",
                assignee: "Miku Kobayashi",
                due_date: "2024-04-10",
                tags: ["frontend", "refactor"],
            },
            {
                title: "Agent API Bridge",
                desc: "Build the AI-powered document parsing interface",
                status: "todo",
                priority: "critical",
                assignee: "Yuki Sato",
                due_date: "2024-05-01",
                tags: ["ai", "backend", "feature"],
            },
            {
                task_name: "Docker Container Optimization",
                desc: "Optimize Docker images for production deployment",
                status: "1",
                priority: "normal",
                assignee: "Kenji Yamamoto",
                due_date: "2024-04-25",
                tags: ["devops", "docker"],
            },
        ];

        await LegacyTask.deleteMany({});
        await LegacyTask.insertMany(sampleLegacyTasks);

        res.json({
            success: true,
            data: { message: `Seeded ${sampleLegacyTasks.length} legacy tasks` },
        });
    } catch (err) {
        next(err);
    }
});

export default router;

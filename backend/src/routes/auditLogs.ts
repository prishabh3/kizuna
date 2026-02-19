import { Router, Request, Response } from "express";
import { AuditLog } from "../models/AuditLog";
import { authenticate } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Get paginated audit logs
 *     tags: [Audit]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *           enum: [User, Task, Leave, Attendance, AgentQuery]
 *     responses:
 *       200:
 *         description: Paginated list of audit logs
 */
router.get("/", authenticate, async (req: Request, res: Response, next) => {
    try {
        const page = parseInt(String(req.query.page || "1"));
        const pageSize = parseInt(String(req.query.pageSize || "20"));
        const targetType = req.query.targetType as string | undefined;

        const filter: any = {};
        if (targetType) filter.targetType = targetType;

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ timestamp: -1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize),
            AuditLog.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: logs,
            meta: { total, page, pageSize },
        });
    } catch (err) {
        next(err);
    }
});

export default router;

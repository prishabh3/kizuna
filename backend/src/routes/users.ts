import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import { validate, createUserSchema, updateUserSchema } from "../validation/schemas";
import { AuditLog } from "../models/AuditLog";
import { createError } from "../middleware/errorHandler";

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (paginated)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 meta:
 *                   type: object
 */
router.get("/", authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const page = parseInt(String(req.query.page || "1"));
        const pageSize = parseInt(String(req.query.pageSize || "20"));
        const department = req.query.department as string | undefined;
        const role = req.query.role as string | undefined;

        const where: any = {};
        if (department) where.department = department;
        if (role) where.role = role;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    department: true,
                    createdAt: true,
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: "desc" },
            }),
            prisma.user.count({ where }),
        ]);

        res.json({
            success: true,
            data: users,
            meta: { total, page, pageSize },
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a single user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
router.get("/:id", authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(req.params.id) },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
                createdAt: true,
                attendances: { take: 5, orderBy: { date: "desc" } },
                leaves: { take: 5, orderBy: { createdAt: "desc" } },
            },
        });

        if (!user) throw createError(404, "User not found");

        res.json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 */
router.post(
    "/",
    authenticate,
    requireRole("ADMIN"),
    validate(createUserSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const { password, ...rest } = req.body;
            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await prisma.user.create({
                data: { ...rest, password: hashedPassword },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    department: true,
                    createdAt: true,
                },
            });

            // Audit log
            await AuditLog.create({
                action: "USER_CREATED",
                actorId: req.user!.id,
                actorEmail: req.user!.email,
                targetType: "User",
                targetId: String(user.id),
                details: { name: user.name, role: user.role },
            });

            res.status(201).json({ success: true, data: user });
        } catch (err: any) {
            if (err.code === "P2002") {
                return next(createError(409, "Email already exists"));
            }
            next(err);
        }
    }
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update a user (Admin only)
 *     tags: [Users]
 */
router.put(
    "/:id",
    authenticate,
    requireRole("ADMIN"),
    validate(updateUserSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const user = await prisma.user.update({
                where: { id: parseInt(req.params.id) },
                data: req.body,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    department: true,
                    createdAt: true,
                },
            });

            await AuditLog.create({
                action: "USER_UPDATED",
                actorId: req.user!.id,
                actorEmail: req.user!.email,
                targetType: "User",
                targetId: String(user.id),
                details: req.body,
            });

            res.json({ success: true, data: user });
        } catch (err: any) {
            if (err.code === "P2025") return next(createError(404, "User not found"));
            next(err);
        }
    }
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [Users]
 */
router.delete(
    "/:id",
    authenticate,
    requireRole("ADMIN"),
    async (req: AuthRequest, res: Response, next) => {
        try {
            await prisma.user.delete({ where: { id: parseInt(req.params.id) } });

            await AuditLog.create({
                action: "USER_DELETED",
                actorId: req.user!.id,
                actorEmail: req.user!.email,
                targetType: "User",
                targetId: req.params.id,
                details: {},
            });

            res.json({ success: true, data: { id: parseInt(req.params.id) } });
        } catch (err: any) {
            if (err.code === "P2025") return next(createError(404, "User not found"));
            next(err);
        }
    }
);

/**
 * @swagger
 * /api/users/metrics/dashboard:
 *   get:
 *     summary: Get dashboard metrics
 *     tags: [Users]
 */
router.get("/metrics/dashboard", authenticate, async (_req, res, next) => {
    try {
        const [totalEmployees, pendingLeaves] = await Promise.all([
            prisma.user.count(),
            prisma.leave.count({ where: { status: "PENDING" } }),
        ]);

        res.json({
            success: true,
            data: {
                totalEmployees,
                activeProjects: 12, // Mock: would come from a project table
                systemEfficiency: 87,
                pendingLeaves,
            },
        });
    } catch (err) {
        next(err);
    }
});

export default router;

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { PrismaClient } from "@prisma/client";

import { connectMongoDB } from "./db/mongoose";
import { globalErrorHandler } from "./middleware/errorHandler";
import { swaggerSpec } from "./swagger";

import usersRouter from "./routes/users";
import tasksRouter from "./routes/tasks";
import agentRouter from "./routes/agent";
import auditLogsRouter from "./routes/auditLogs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const prisma = new PrismaClient();

// ── Core Middleware ────────────────────────────────────────────────────────────
app.use(
    cors({
        origin: [
            "http://localhost:3000",
            "http://frontend:3000",
        ],
        credentials: true,
    })
);
app.use(
    helmet({
        contentSecurityPolicy: false, // Disabled to allow Swagger UI inline scripts
    })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── API Documentation ──────────────────────────────────────────────────────────
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
        customSiteTitle: "Kizuna DX API Docs",
        customCss: `.swagger-ui .topbar { background-color: #1e1b4b; }`,
    })
);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "kizuna-backend",
        timestamp: new Date().toISOString(),
    });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/users", usersRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/agent", agentRouter);
app.use("/api/audit-logs", auditLogsRouter);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found",
        code: 404,
    });
});

// ── Global Error Handler (must be last) ───────────────────────────────────────
app.use(globalErrorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
async function start() {
    try {
        // Connect to MongoDB
        await connectMongoDB();

        // Connect to MySQL (Prisma)
        await prisma.$connect();
        console.log("✅ MySQL (Prisma) connected successfully");

        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════╗
║         Kizuna DX Backend Server           ║
║  Port    : ${PORT}                            ║
║  API Docs: http://localhost:${PORT}/api-docs  ║
║  Health  : http://localhost:${PORT}/health    ║
╚════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}

start();

// Graceful shutdown
process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully...");
    await prisma.$disconnect();
    process.exit(0);
});

import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { AuditLog } from "../models/AuditLog";
import { ApiDoc } from "../models/ApiDoc";
import { validate, parseDocsSchema } from "../validation/schemas";
import { ParsedTicket, TaskPriority } from "../types";
import { createError } from "../middleware/errorHandler";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Mock AI Agent Pipeline
//
// In production this would call an LLM (e.g., Gemini Pro / GPT-4).
// Here we simulate a multi-stage pipeline:
//   Stage 1: Language Detection
//   Stage 2: Intent Extraction (keyword heuristics)
//   Stage 3: Schema Inference
//   Stage 4: Ticket Generation
// ─────────────────────────────────────────────────────────────────────────────

interface AgentContext {
    rawText: string;
    extractedKeywords: string[];
    inferredEndpoint: string;
    inferredMethod: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    inferredEntity: string;
    priority: TaskPriority;
    storyPoints: number;
}


/**
 * Stage 2 — Extract keywords and infer API intent from the text.
 */
function extractIntent(text: string): Partial<AgentContext> {
    const lower = text.toLowerCase();

    // HTTP Method inference
    const methodMap: [RegExp, AgentContext["inferredMethod"]][] = [
        [/get|fetch|retrieve|list/i, "GET"],
        [/post|create|add|insert/i, "POST"],
        [/put|update|edit|modify/i, "PUT"],
        [/delete|remove/i, "DELETE"],
        [/patch|partial/i, "PATCH"],
    ];

    let inferredMethod: AgentContext["inferredMethod"] = "POST";
    for (const [pattern, method] of methodMap) {
        if (pattern.test(lower)) {
            inferredMethod = method;
            break;
        }
    }

    // Entity inference
    const entities: Record<string, string> = {
        "user|users": "users",
        "task|tasks|issue": "tasks",
        "auth|login|authentication": "auth",
        "document|docs": "documents",
        "project|projects": "projects",
        "leave|leaves|vacation": "leaves",
        "report|reports": "reports",
        "settings|config": "settings",
    };

    let inferredEntity = "resources";
    for (const [pattern, entity] of Object.entries(entities)) {
        if (new RegExp(pattern, "i").test(text)) {
            inferredEntity = entity;
            break;
        }
    }

    // Keyword extraction (simple tokenization)
    const keywords = text
        .split(/[\s、。，,.\n]+/)
        .filter((w) => w.length > 1)
        .slice(0, 8)
        .map((w) => w.trim());

    // Priority inference
    let priority: TaskPriority = "MEDIUM";
    if (/urgent|critical/i.test(text)) priority = "CRITICAL";
    else if (/high|important/i.test(text)) priority = "HIGH";
    else if (/low|minor/i.test(text)) priority = "LOW";

    // Story points (rough heuristic based on text complexity)
    const sentences = text.split(/[。.!?\n]+/).filter(Boolean).length;
    const storyPoints = Math.min(Math.max(Math.ceil(sentences / 2), 1), 13);

    return {
        extractedKeywords: keywords,
        inferredEndpoint: `/api/${inferredEntity}`,
        inferredMethod,
        inferredEntity,
        priority,
        storyPoints,
    };
}

/**
 * Stage 3 — Infer request/response JSON schema fields.
 */
function inferSchema(entity: string, method: string): { requestBody: any[]; responseBody: any[] } {
    const commonFields = [
        { name: "id", type: "string", required: false, description: "Unique identifier", example: "uuid-v4" },
        { name: "createdAt", type: "string (ISO 8601)", required: false, description: "Creation timestamp", example: "2024-01-01T00:00:00Z" },
        { name: "updatedAt", type: "string (ISO 8601)", required: false, description: "Last update timestamp", example: "2024-01-01T00:00:00Z" },
    ];

    const entityFields: Record<string, any[]> = {
        users: [
            { name: "name", type: "string", required: true, description: "Full name of the user", example: "Tanaka Hiroshi" },
            { name: "email", type: "string", required: true, description: "Email address", example: "user@kizuna.com" },
            { name: "role", type: "enum (ADMIN|MANAGER|EMPLOYEE)", required: false, description: "User access role", example: "EMPLOYEE" },
            { name: "department", type: "string", required: true, description: "Department name", example: "Engineering" },
        ],
        tasks: [
            { name: "title", type: "string", required: true, description: "Task title", example: "Implement Auth API" },
            { name: "status", type: "enum (TODO|IN_PROGRESS|REVIEW|DONE)", required: true, description: "Task status", example: "TODO" },
            { name: "priority", type: "enum (LOW|MEDIUM|HIGH|CRITICAL)", required: false, description: "Task priority", example: "HIGH" },
            { name: "assignee", type: "string", required: false, description: "Assigned user name", example: "James Rodriguez" },
        ],
        auth: [
            { name: "email", type: "string", required: true, description: "User email for login", example: "user@kizuna.com" },
            { name: "password", type: "string", required: true, description: "User password (min 6 chars)", example: "••••••••" },
            { name: "token", type: "string (JWT)", required: false, description: "JWT access token returned on success" },
        ],
    };

    const specificFields = entityFields[entity] || [
        { name: "data", type: "object", required: true, description: "Main request payload" },
        { name: "metadata", type: "object", required: false, description: "Optional metadata" },
    ];

    const isRead = method === "GET" || method === "DELETE";
    const requestBody = isRead ? [] : specificFields.filter((f) => f.name !== "id");
    const responseBody = [...specificFields, ...commonFields];

    return { requestBody, responseBody };
}

/**
 * Stage 4 — Assemble the final Jira-style ticket.
 */
function generateTicket(ctx: AgentContext): ParsedTicket {
    const { inferredMethod, inferredEndpoint, inferredEntity } = ctx;
    const actionWord = {
        GET: "Fetch",
        POST: "Create",
        PUT: "Update",
        DELETE: "Delete",
        PATCH: "Partially Update",
    }[inferredMethod];

    const entityLabel = inferredEntity.replace(/-/g, " ").replace(/s$/, "");

    const summary = `[API] ${actionWord} ${entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)} — Parsed from specification`;

    const description = [
        `**Inferred Endpoint:** \`${inferredMethod} ${inferredEndpoint}\``,
        `**Extracted Keywords:** ${ctx.extractedKeywords.join(", ")}`,
        "",
        "**Original Documentation Excerpt:**",
        `> ${ctx.rawText.substring(0, 300)}${ctx.rawText.length > 300 ? "..." : ""}`,
    ].join("\n");

    const acceptanceCriteria = [
        {
            given: `A authenticated user with appropriate permissions`,
            when: `A ${inferredMethod} request is sent to \`${inferredEndpoint}\` with valid payload`,
            then: `The API responds with HTTP 200/201 and a JSON body conforming to the defined response schema`,
        },
        {
            given: `An unauthenticated user`,
            when: `A ${inferredMethod} request is sent to \`${inferredEndpoint}\``,
            then: `The API responds with HTTP 401 Unauthorized`,
        },
        {
            given: `A request with missing required fields`,
            when: `A ${inferredMethod} request is sent to \`${inferredEndpoint}\` with an invalid payload`,
            then: `The API responds with HTTP 400 and a descriptive validation error`,
        },
    ];

    const { requestBody, responseBody } = inferSchema(inferredEntity, inferredMethod);

    const labels = [
        "api",
        inferredEntity,
        "parsed-spec",
        "kizuna",
        ctx.priority.toLowerCase(),
    ];

    return {
        ticketId: `KDX-${Date.now().toString(36).toUpperCase()}`,
        summary,
        description,
        acceptanceCriteria,
        jsonSchema: {
            endpoint: inferredEndpoint,
            method: inferredMethod,
            requestBody,
            responseBody,
        },
        priority: ctx.priority,
        estimatedStoryPoints: ctx.storyPoints,
        labels,
        generatedAt: new Date().toISOString(),
    };
}

/**
 * @swagger
 * /api/agent/parse-docs:
 *   post:
 *     summary: AI Agent — Parse API documentation into structured tickets
 *     tags: [Agent]
 *     description: |
 *       The Agentic API Bridge. Accepts raw, unstructured technical documentation
 *       and returns a structured Jira-style ticket with summary, acceptance criteria,
 *       and inferred JSON schema.
 *
 *       Pipeline stages:
 *       1. Intent Extraction (endpoint, method, entity)
 *       2. JSON Schema Inference
 *       3. Ticket Assembly
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rawText
 *             properties:
 *               rawText:
 *                 type: string
 *                 description: Raw API documentation text
 *               sourceLanguage:
 *                 type: string
 *                 enum: [auto, text]
 *                 default: auto
 *     responses:
 *       200:
 *         description: Successfully parsed documentation into a structured ticket
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/ParsedTicket'
 *       400:
 *         description: Validation error - text too short
 */
router.post(
    "/parse-docs",
    authenticate,
    validate(parseDocsSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const { rawText, sourceLanguage } = req.body;

            const language = "en";

            const intentContext = extractIntent(rawText);

            const agentContext: AgentContext = {
                rawText,
                extractedKeywords: intentContext.extractedKeywords || [],
                inferredEndpoint: intentContext.inferredEndpoint || "/api/resources",
                inferredMethod: intentContext.inferredMethod || "POST",
                inferredEntity: intentContext.inferredEntity || "resources",
                priority: intentContext.priority || "MEDIUM",
                storyPoints: intentContext.storyPoints || 3,
            };

            // Small artificial delay to simulate LLM processing
            await new Promise((resolve) => setTimeout(resolve, 600));

            const ticket = generateTicket(agentContext);

            // Save the raw doc to MongoDB for history
            await ApiDoc.create({
                title: ticket.summary.substring(0, 100),
                rawContent: rawText,
                language,
                uploadedBy: req.user!.id,
            });

            // Audit log
            await AuditLog.create({
                action: "AGENT_PARSE_DOCS",
                actorId: req.user!.id,
                actorEmail: req.user!.email,
                targetType: "AgentQuery",
                targetId: ticket.ticketId,
                details: {
                    language,
                    inferredEndpoint: agentContext.inferredEndpoint,
                    priority: agentContext.priority,
                },
            });

            res.json({ success: true, data: ticket });
        } catch (err) {
            next(err);
        }
    }
);

/**
 * @swagger
 * /api/agent/history:
 *   get:
 *     summary: Get recently parsed API docs history
 *     tags: [Agent]
 */
router.get("/history", authenticate, async (_req, res, next) => {
    try {
        const docs = await ApiDoc.find().sort({ createdAt: -1 }).limit(20);
        res.json({ success: true, data: docs });
    } catch (err) {
        next(err);
    }
});

export default router;

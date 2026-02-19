import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Kizuna DX API",
            version: "1.0.0",
            description:
                "Enterprise HR & Project Management API — Kizuna DX. Implements the Strangler Fig pattern with dual MySQL/MongoDB databases.",
            contact: {
                name: "Kizuna DX Engineering Team",
            },
        },
        servers: [
            {
                url: "http://localhost:4000",
                description: "Development Server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                User: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        name: { type: "string" },
                        email: { type: "string", format: "email" },
                        role: { type: "string", enum: ["ADMIN", "MANAGER", "EMPLOYEE"] },
                        department: { type: "string" },
                        createdAt: { type: "string", format: "date-time" },
                    },
                },
                NormalizedTask: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        status: {
                            type: "string",
                            enum: ["TODO", "IN_PROGRESS", "REVIEW", "DONE"],
                        },
                        priority: {
                            type: "string",
                            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                        },
                        assignee: { type: "string" },
                        dueDate: { type: "string", format: "date-time", nullable: true },
                        tags: { type: "array", items: { type: "string" } },
                        normalizedAt: { type: "string", format: "date-time" },
                    },
                },
                ParsedTicket: {
                    type: "object",
                    properties: {
                        ticketId: { type: "string" },
                        summary: { type: "string" },
                        description: { type: "string" },
                        acceptanceCriteria: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    given: { type: "string" },
                                    when: { type: "string" },
                                    then: { type: "string" },
                                },
                            },
                        },
                        jsonSchema: { type: "object" },
                        priority: { type: "string" },
                        estimatedStoryPoints: { type: "integer" },
                        labels: { type: "array", items: { type: "string" } },
                        generatedAt: { type: "string", format: "date-time" },
                    },
                },
                ApiError: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: false },
                        error: { type: "string" },
                        code: { type: "integer" },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);

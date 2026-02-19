import { Schema, model, Document } from "mongoose";

export interface IAuditLog extends Document {
    action: string;
    actorId: number;
    actorEmail: string;
    targetType: "User" | "Task" | "Leave" | "Attendance" | "AgentQuery";
    targetId: string;
    details: Record<string, unknown>;
    timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        action: { type: String, required: true },
        actorId: { type: Number, required: true },
        actorEmail: { type: String, required: true },
        targetType: {
            type: String,
            required: true,
            enum: ["User", "Task", "Leave", "Attendance", "AgentQuery"],
        },
        targetId: { type: String, required: true },
        details: { type: Schema.Types.Mixed, default: {} },
        timestamp: { type: Date, default: Date.now },
    },
    {
        collection: "audit_logs",
    }
);

// Index for efficient querying
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ actorId: 1 });
AuditLogSchema.index({ targetType: 1 });

export const AuditLog = model<IAuditLog>("AuditLog", AuditLogSchema);

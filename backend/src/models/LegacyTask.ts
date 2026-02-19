import { Schema, model, Document } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// LegacyTask — Intentionally messy schema to simulate real legacy data
// A task might have its title in `title`, `タイトル`, OR `task_name`.
// The status might be "todo", "進行中", "done", or a numeric code like "2".
// This is the raw data that flows through the legacyAdapter middleware.
// ─────────────────────────────────────────────────────────────────────────────

export interface ILegacyTask extends Document {
    // Title — one of these may be set
    title?: string;
    タイトル?: string;
    task_name?: string;

    // Description — one of these may be set
    desc?: string;
    説明?: string;

    // Status — inconsistent values
    status?: string | number;

    // Priority — string or number
    priority?: string | number;

    // Assignee — one of these may be set
    assignee?: string;
    担当者?: string;

    // Due date — one of these may be set
    due?: string;
    due_date?: string;
    期日?: string;

    // Free-form tags
    tags?: string[] | string;

    // Legacy system metadata
    sys_id?: string;
    legacy_ref?: string;
    raw_json?: Record<string, unknown>;

    createdAt?: Date;
    updatedAt?: Date;
}

const LegacyTaskSchema = new Schema<ILegacyTask>(
    {
        // Allow completely flexible schema (no strict mode) to simulate legacy chaos
        title: { type: String },
        タイトル: { type: String },
        task_name: { type: String },
        desc: { type: String },
        説明: { type: String },
        status: { type: Schema.Types.Mixed },
        priority: { type: Schema.Types.Mixed },
        assignee: { type: String },
        担当者: { type: String },
        due: { type: String },
        due_date: { type: String },
        期日: { type: String },
        tags: { type: Schema.Types.Mixed },
        sys_id: { type: String },
        legacy_ref: { type: String },
        raw_json: { type: Schema.Types.Mixed },
    },
    {
        strict: false, // ← Key: allows any extra fields
        timestamps: true,
        collection: "legacy_tasks",
    }
);

export const LegacyTask = model<ILegacyTask>("LegacyTask", LegacyTaskSchema);

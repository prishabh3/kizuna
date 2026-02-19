// ─────────────────────────────────────────────────────────────────────────────
// Kizuna DX — Shared TypeScript Types
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ─────────────────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// ── MySQL / Prisma Models ─────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  createdAt: string; // ISO string
}

export interface Attendance {
  id: number;
  userId: number;
  date: string;
  status: AttendanceStatus;
  user?: User;
}

export interface Leave {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  user?: User;
}

// ── MongoDB / Mongoose Models ─────────────────────────────────────────────────

/** Raw legacy task shape — intentionally messy to simulate legacy data */
export interface RawLegacyTask {
  _id: string;
  // Inconsistent field names from the legacy system
  title?: string;
  task_name?: string;
  desc?: string;
  description?: string;
  status?: string; // Could be "todo", "in-progress", "done", "2", etc.
  priority?: string | number;
  assignee?: string;
  due?: string;
  due_date?: string;
  created?: string;
  createdAt?: string;
  tags?: string[] | string;
}

/** Normalized task shape after the Express adapter middleware */
export interface NormalizedTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  dueDate: string | null;
  tags: string[];
  normalizedAt: string;
}

export interface AuditLog {
  _id: string;
  action: string;
  actorId: number;
  actorEmail: string;
  targetType: "User" | "Task" | "Leave" | "Attendance" | "AgentQuery";
  targetId: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface ApiDoc {
  _id: string;
  title: string;
  rawContent: string;
  language: "en" | "mixed";
  uploadedBy: number;
  createdAt: string;
}

// ── Agent / AI Bridge ─────────────────────────────────────────────────────────

export interface ParseDocsRequest {
  rawText: string;
  sourceLanguage?: "auto" | "text";
}

export interface AcceptanceCriteria {
  given: string;
  when: string;
  then: string;
}

export interface JsonSchemaField {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string | number | boolean;
}

export interface ParsedTicket {
  ticketId: string;
  summary: string;
  description: string;
  acceptanceCriteria: AcceptanceCriteria[];
  jsonSchema: {
    endpoint: string;
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    requestBody: JsonSchemaField[];
    responseBody: JsonSchemaField[];
  };
  priority: TaskPriority;
  estimatedStoryPoints: number;
  labels: string[];
  generatedAt: string;
}

// ── API Response Wrappers ─────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

export interface ApiError {
  success: false;
  error: string;
  code: number;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Dashboard Metrics ─────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalEmployees: number;
  activeProjects: number;
  systemEfficiency: number; // percentage 0-100
  pendingLeaves: number;
  tasksByStatus: Record<TaskStatus, number>;
}

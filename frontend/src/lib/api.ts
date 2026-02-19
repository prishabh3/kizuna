import axios from "axios";
import type {
    User,
    NormalizedTask,
    ParsedTicket,
    ParseDocsRequest,
    AuditLog,
    DashboardMetrics,
    ApiSuccess,
} from "@/types";

const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Dev mode: include a default user header so the backend doesn't require real JWT
if (typeof window !== "undefined") {
    apiClient.defaults.headers.common["x-dev-user"] = JSON.stringify({
        id: 1,
        email: "hiroshi.tanaka@kizuna.com",
        role: "ADMIN",
        name: "Hiroshi Tanaka",
    });
}

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const message =
            error.response?.data?.error ||
            error.message ||
            "An unexpected error occurred";
        return Promise.reject(new Error(message));
    }
);

// ── Users API ─────────────────────────────────────────────────────────────────

export async function getUsers(params?: {
    page?: number;
    pageSize?: number;
    department?: string;
    role?: string;
}): Promise<ApiSuccess<User[]>> {
    const res = await apiClient.get("/api/users", { params });
    return res.data;
}

export async function getUser(id: number): Promise<ApiSuccess<User>> {
    const res = await apiClient.get(`/api/users/${id}`);
    return res.data;
}

export async function createUser(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    department: string;
}): Promise<ApiSuccess<User>> {
    const res = await apiClient.post("/api/users", data);
    return res.data;
}

export async function updateUser(
    id: number,
    data: Partial<User>
): Promise<ApiSuccess<User>> {
    const res = await apiClient.put(`/api/users/${id}`, data);
    return res.data;
}

export async function deleteUser(id: number): Promise<ApiSuccess<{ id: number }>> {
    const res = await apiClient.delete(`/api/users/${id}`);
    return res.data;
}

export async function getDashboardMetrics(): Promise<ApiSuccess<DashboardMetrics>> {
    const res = await apiClient.get("/api/users/metrics/dashboard");
    return res.data;
}

// ── Tasks API ─────────────────────────────────────────────────────────────────

export async function getTasks(): Promise<ApiSuccess<NormalizedTask[]>> {
    const res = await apiClient.get("/api/tasks");
    return res.data;
}

export async function createTask(data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assignee?: string;
    dueDate?: string;
    tags?: string[];
}): Promise<ApiSuccess<NormalizedTask>> {
    const res = await apiClient.post("/api/tasks", data);
    return res.data;
}

export async function updateTaskStatus(
    id: string,
    status: string
): Promise<ApiSuccess<NormalizedTask>> {
    const res = await apiClient.patch(`/api/tasks/${id}`, { status });
    return res.data;
}

export async function seedLegacyTasks(): Promise<ApiSuccess<{ message: string }>> {
    const res = await apiClient.post("/api/tasks/seed/legacy");
    return res.data;
}

// ── Agent API ─────────────────────────────────────────────────────────────────

export async function parseDocs(
    data: ParseDocsRequest
): Promise<ApiSuccess<ParsedTicket>> {
    const res = await apiClient.post("/api/agent/parse-docs", data);
    return res.data;
}

export async function getAgentHistory(): Promise<ApiSuccess<unknown[]>> {
    const res = await apiClient.get("/api/agent/history");
    return res.data;
}

// ── Audit Logs API ────────────────────────────────────────────────────────────

export async function getAuditLogs(params?: {
    page?: number;
    pageSize?: number;
    targetType?: string;
}): Promise<ApiSuccess<AuditLog[]>> {
    const res = await apiClient.get("/api/audit-logs", { params });
    return res.data;
}

"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp, CalendarOff, Activity, Plus, Pencil, Trash2, X, Check, ChevronDown } from "lucide-react";
import { getUsers, getDashboardMetrics, createUser, updateUser, deleteUser } from "@/lib/api";
import type { User, DashboardMetrics } from "@/types";

/* ── tiny helpers ───────────────────────────────── */
const Skeleton = ({ w = "100%", h = 16 }: { w?: string | number; h?: number }) => (
    <div className="skeleton" style={{ width: w, height: h }} />
);

const RolePill = ({ role }: { role: User["role"] }) => {
    const map: Record<User["role"], string> = {
        ADMIN: "badge badge-red",
        MANAGER: "badge badge-blue",
        EMPLOYEE: "badge badge-slate",
    };
    return <span className={map[role]}>{role}</span>;
};

/* ── add / edit modal ────────────────────────────── */
function UserModal({
    mode, user, onClose, onSave,
}: {
    mode: "add" | "edit"; user?: User; onClose: () => void; onSave: (d: Record<string, string>) => Promise<void>;
}) {
    const [form, setForm] = useState({
        name: user?.name ?? "", email: user?.email ?? "", password: "",
        role: user?.role ?? "EMPLOYEE", department: user?.department ?? "",
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setErr("");
        try { await onSave(form as any); onClose(); }
        catch (ex: any) { setErr(ex.message); }
        finally { setSaving(false); }
    };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", padding: 16
        }}>
            <div className="surface animate-fade-in" style={{ width: "100%", maxWidth: 440, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 600, color: "hsl(0 0% 90%)" }}>
                        {mode === "add" ? "New Employee" : "Edit Employee"}
                    </h2>
                    <button onClick={onClose} style={{ color: "hsl(0 0% 40%)" }}><X size={16} /></button>
                </div>
                {err && (
                    <div style={{
                        marginBottom: 16, padding: "8px 12px", background: "hsl(0 84% 60% / 0.1)",
                        border: "1px solid hsl(0 84% 60% / 0.2)", borderRadius: 6, fontSize: 12, color: "hsl(0 84% 65%)"
                    }}>
                        {err}
                    </div>
                )}
                <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                        { key: "name", label: "Full name", type: "text" },
                        { key: "email", label: "Email", type: "email" },
                        ...(mode === "add" ? [{ key: "password", label: "Password", type: "password" }] : []),
                        { key: "department", label: "Department", type: "text" },
                    ].map(({ key, label, type }) => (
                        <div key={key}>
                            <label style={{ fontSize: 11, fontWeight: 500, color: "hsl(0 0% 40%)", display: "block", marginBottom: 4 }}>{label}</label>
                            <input type={type} value={(form as any)[key]} onChange={set(key)} required={key !== "password" || mode === "add"} className="input" />
                        </div>
                    ))}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 500, color: "hsl(0 0% 40%)", display: "block", marginBottom: 4 }}>Role</label>
                            <select value={form.role} onChange={set("role")} className="input">
                                {["ADMIN", "MANAGER", "EMPLOYEE"].map(r => <option key={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
                        <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                            {saving ? <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : <Check size={13} />}
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ── metric card ─────────────────────────────────── */
function Metric({ label, value, change, icon: Icon }: {
    label: string; value: number | null; change?: string; icon: React.ElementType;
}) {
    return (
        <div className="metric-card">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                    <p style={{ fontSize: 11, fontWeight: 500, color: "hsl(0 0% 40%)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{label}</p>
                    {value !== null
                        ? <p style={{ fontSize: 28, fontWeight: 700, color: "hsl(0 0% 92%)", lineHeight: 1 }}>{value}</p>
                        : <Skeleton w={64} h={28} />}
                    {change && <p style={{ fontSize: 11, color: "hsl(142 71% 50%)", marginTop: 6 }}>{change}</p>}
                </div>
                <div style={{ padding: 8, background: "hsl(0 0% 13%)", borderRadius: 6 }}>
                    <Icon size={16} style={{ color: "hsl(0 0% 45%)" }} />
                </div>
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────── */
export default function DashboardPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<{ mode: "add" | "edit"; user?: User } | null>(null);
    const [deleting, setDeleting] = useState<number | null>(null);

    const refresh = async () => {
        try {
            const [m, u] = await Promise.all([getDashboardMetrics(), getUsers({ pageSize: 100 })]);
            if (m.success) setMetrics(m.data);
            if (u.success) setUsers(u.data);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { refresh(); }, []);

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: "hsl(0 0% 92%)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>People</h1>
                    <p style={{ fontSize: 13, color: "hsl(0 0% 38%)", marginTop: 4 }}>
                        {metrics ? `${metrics.totalEmployees} employees across all departments` : "Loading…"}
                    </p>
                </div>
                <button className="btn-primary" onClick={() => setModal({ mode: "add" })}>
                    <Plus size={14} /> Add Employee
                </button>
            </div>

            {/* Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <Metric label="Total Employees" value={metrics?.totalEmployees ?? null} icon={Users} change="+2 this month" />
                <Metric label="Efficiency" value={metrics?.systemEfficiency ?? null} icon={Activity} change="Target 95%" />
                <Metric label="Active Projects" value={metrics?.activeProjects ?? null} icon={TrendingUp} />
                <Metric label="Pending Leaves" value={metrics?.pendingLeaves ?? null} icon={CalendarOff} />
            </div>

            {/* Table */}
            <div className="surface" style={{ overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid hsl(0 0% 14%)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(0 0% 80%)" }}>Directory</span>
                    <span style={{ fontSize: 12, color: "hsl(0 0% 35%)" }}>{users.length} records</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i}>
                                    {Array.from({ length: 6 }).map((_, j) => (
                                        <td key={j}><Skeleton w={j === 5 ? 40 : "80%"} /></td>
                                    ))}
                                </tr>
                            )) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: "center", padding: "40px 16px", color: "hsl(0 0% 35%)", fontSize: 13 }}>
                                        No employees yet. Add someone above.
                                    </td>
                                </tr>
                            ) : users.map(u => (
                                <tr key={u.id}>
                                    <td style={{ fontWeight: 500, color: "hsl(0 0% 88%)", fontSize: 13 }}>{u.name}</td>
                                    <td style={{ color: "hsl(0 0% 40%)", fontSize: 12, fontFamily: "monospace" }}>{u.email}</td>
                                    <td><RolePill role={u.role} /></td>
                                    <td style={{ color: "hsl(0 0% 55%)", fontSize: 13 }}>{u.department}</td>
                                    <td>
                                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                            <button
                                                className="btn-ghost"
                                                style={{ padding: "3px 8px", fontSize: 12 }}
                                                onClick={() => setModal({ mode: "edit", user: u })}
                                            >
                                                <Pencil size={12} /> Edit
                                            </button>
                                            {deleting === u.id ? (
                                                <div style={{ display: "flex", gap: 4 }}>
                                                    <button className="btn" style={{ padding: "3px 8px", fontSize: 12, background: "hsl(0 84% 60% / 0.15)", color: "hsl(0 84% 65%)", border: "1px solid hsl(0 84% 60% / 0.2)", borderRadius: 4 }}
                                                        onClick={async () => { await deleteUser(u.id); setDeleting(null); refresh(); }}>
                                                        <Check size={12} /> Confirm
                                                    </button>
                                                    <button className="btn-ghost" style={{ padding: "3px 8px", fontSize: 12 }} onClick={() => setDeleting(null)}>
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button className="btn-ghost" style={{ padding: "3px 8px", fontSize: 12, color: "hsl(0 0% 35%)" }}
                                                    onClick={() => setDeleting(u.id)}>
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {modal && (
                <UserModal mode={modal.mode} user={modal.user} onClose={() => setModal(null)}
                    onSave={async (d) => {
                        if (modal.mode === "add") await createUser(d as any);
                        else if (modal.user) await updateUser(modal.user.id, d as any);
                        await refresh();
                    }} />
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
        </div>
    );
}

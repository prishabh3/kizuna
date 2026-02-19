"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getAuditLogs } from "@/lib/api";
import type { AuditLog } from "@/types";

const ACTION_COLOR: Record<string, { bg: string; text: string }> = {
    USER_CREATED: { bg: "hsl(142 71% 45% / 0.1)", text: "hsl(142 71% 55%)" },
    USER_UPDATED: { bg: "hsl(213 94% 68% / 0.1)", text: "hsl(213 94% 68%)" },
    USER_DELETED: { bg: "hsl(0 84% 60% / 0.1)", text: "hsl(0 84% 60%)" },
    TASK_CREATED: { bg: "hsl(270 87% 65% / 0.1)", text: "hsl(270 87% 70%)" },
    TASK_STATUS_UPDATED: { bg: "hsl(38 92% 50% / 0.1)", text: "hsl(38 92% 60%)" },
    AGENT_PARSE_DOCS: { bg: "hsl(142 71% 45% / 0.08)", text: "hsl(142 71% 50%)" },
};

const ActionBadge = ({ action }: { action: string }) => {
    const c = ACTION_COLOR[action] ?? { bg: "hsl(0 0% 13%)", text: "hsl(0 0% 40%)" };
    return (
        <span style={{
            fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
            background: c.bg, color: c.text, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.03em", textTransform: "uppercase"
        }}>
            {action.replace(/_/g, " ")}
        </span>
    );
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const PAGE_SIZE = 25;

    const fetch = async (p = 1) => {
        setLoading(true);
        try {
            const r = await getAuditLogs({ page: p, pageSize: PAGE_SIZE });
            if (r.success) { setLogs(r.data); setTotal((r as any).meta?.total ?? r.data.length); }
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch(page); }, [page]);

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: "hsl(0 0% 92%)", letterSpacing: "-0.02em" }}>Audit Log</h1>
                    <p style={{ fontSize: 13, color: "hsl(0 0% 38%)", marginTop: 4 }}>All system events, stored in MongoDB</p>
                </div>
                <button className="btn-ghost" onClick={() => fetch(page)} disabled={loading}>
                    <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : undefined }} />
                    Refresh
                </button>
            </div>

            <div className="surface" style={{ overflow: "hidden" }}>
                {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} style={{ display: "flex", gap: 16, padding: "10px 16px", borderBottom: "1px solid hsl(0 0% 12%)" }}>
                            {[80, 120, 100, 160, 90].map((w, j) => (
                                <div key={j} className="skeleton" style={{ width: w, height: 14, flexShrink: 0 }} />
                            ))}
                        </div>
                    ))
                ) : logs.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 16px", fontSize: 13, color: "hsl(0 0% 30%)" }}>
                        No events yet. Actions you perform will appear here.
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Action</th>
                                    <th>Actor</th>
                                    <th>Target</th>
                                    <th>Details</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log._id}>
                                        <td><ActionBadge action={log.action} /></td>
                                        <td style={{ fontSize: 12, color: "hsl(0 0% 45%)", fontFamily: "monospace" }}>{log.actorEmail}</td>
                                        <td>
                                            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "hsl(0 0% 55%)" }}>{log.targetType}</span>
                                            <span style={{ fontSize: 10, color: "hsl(0 0% 28%)", marginLeft: 4 }}>#{log.targetId.slice(-6)}</span>
                                        </td>
                                        <td style={{ fontSize: 11, fontFamily: "monospace", color: "hsl(0 0% 30%)", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {JSON.stringify(log.details)}
                                        </td>
                                        <td style={{ fontSize: 11, color: "hsl(0 0% 28%)", whiteSpace: "nowrap" }}>
                                            {new Date(log.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {total > PAGE_SIZE && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid hsl(0 0% 14%)", fontSize: 12, color: "hsl(0 0% 35%)" }}>
                        <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
                        <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn-ghost" style={{ padding: "3px 10px", fontSize: 12 }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                            <button className="btn-ghost" style={{ padding: "3px 10px", fontSize: 12 }} disabled={page * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>Next</button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
        </div>
    );
}

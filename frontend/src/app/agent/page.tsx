"use client";

import { useState } from "react";
import { Zap, Send, Copy, Check, ChevronRight, ArrowRight } from "lucide-react";
import { parseDocs } from "@/lib/api";
import type { ParsedTicket } from "@/types";

const EXAMPLE_EN = `User Authentication API Specification

Endpoint: POST /api/v2/auth/login

This endpoint authenticates a registered user using email and password,
returning a JWT access token and refresh token.

Request fields:
- email (string, required): User email address
- password (string, required): Minimum 8 characters

On success returns HTTP 200 with:
- access_token: JWT (expires 1 hour)
- refresh_token: Refresh token (expires 7 days)

Errors:
- 401: Invalid credentials
- 429: Rate limit exceeded (10 requests/minute)`;



const STAGES = ["Language Detection", "Intent Extraction", "Schema Inference", "Ticket Assembly"];

const priorityColor: Record<string, string> = {
    LOW: "hsl(0 0% 45%)",
    MEDIUM: "hsl(213 94% 65%)",
    HIGH: "hsl(38 92% 60%)",
    CRITICAL: "hsl(0 84% 65%)",
};

type TabKey = "summary" | "criteria" | "schema" | "json";

const TABS: { key: TabKey; label: string }[] = [
    { key: "summary", label: "Summary" },
    { key: "criteria", label: "Acceptance Criteria" },
    { key: "schema", label: "Schema" },
    { key: "json", label: "Raw JSON" },
];

function TabButton({ k, current, label, onClick }: { k: TabKey; current: TabKey; label: string; onClick: () => void }) {
    const active = k === current;
    return (
        <button
            onClick={onClick}
            style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "5px 10px",
                border: "none",
                borderBottom: active ? "2px solid hsl(142 71% 45%)" : "2px solid transparent",
                background: "transparent",
                color: active ? "hsl(0 0% 85%)" : "hsl(0 0% 35%)",
                cursor: "pointer",
                marginBottom: -1,
                transition: "all 0.1s",
            }}
        >
            {label}
        </button>
    );
}

export default function AgentPage() {
    const [raw, setRaw] = useState("");
    const [parsing, setParsing] = useState(false);
    const [ticket, setTicket] = useState<ParsedTicket | null>(null);
    const [err, setErr] = useState("");
    const [copied, setCopied] = useState(false);
    const [tab, setTab] = useState<TabKey>("summary");

    const handleParse = async () => {
        if (!raw.trim()) return;
        setParsing(true);
        setErr("");
        setTicket(null);
        try {
            const r = await parseDocs({ rawText: raw, sourceLanguage: "auto" });
            if (r.success) setTicket(r.data);
        } catch (ex: any) {
            setErr(ex.message);
        } finally {
            setParsing(false);
        }
    };

    const copy = () => {
        if (!ticket) return;
        navigator.clipboard.writeText(JSON.stringify(ticket, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Header */}
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <div style={{ padding: "6px 8px", background: "hsl(142 71% 45% / 0.1)", border: "1px solid hsl(142 71% 45% / 0.2)", borderRadius: 6 }}>
                        <Zap size={16} style={{ color: "hsl(142 71% 55%)" }} />
                    </div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: "hsl(0 0% 92%)", letterSpacing: "-0.02em" }}>AI Bridge</h1>
                </div>
                <p style={{ fontSize: 13, color: "hsl(0 0% 38%)" }}>
                    Paste API documentation → get a structured engineering ticket
                </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Input panel */}
                <div className="surface" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(0 0% 55%)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Input
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn-ghost" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => setRaw(EXAMPLE_EN)}>Load Example</button>
                        </div>
                    </div>

                    <textarea
                        value={raw}
                        onChange={e => setRaw(e.target.value)}
                        placeholder="Paste API documentation, technical spec, or design notes…"
                        style={{
                            flex: 1,
                            minHeight: 260,
                            resize: "none",
                            background: "hsl(0 0% 5%)",
                            border: "1px solid hsl(0 0% 16%)",
                            borderRadius: 6,
                            padding: "10px 12px",
                            fontSize: 12,
                            color: "hsl(0 0% 80%)",
                            fontFamily: "JetBrains Mono, monospace",
                            lineHeight: 1.6,
                            outline: "none",
                        }}
                        onFocus={e => { e.target.style.borderColor = "hsl(142 71% 45% / 0.4)"; }}
                        onBlur={e => { e.target.style.borderColor = "hsl(0 0% 16%)"; }}
                    />

                    {err && (
                        <div style={{ fontSize: 12, color: "hsl(0 84% 60%)", background: "hsl(0 84% 60% / 0.08)", padding: "6px 10px", borderRadius: 5, border: "1px solid hsl(0 84% 60% / 0.2)" }}>
                            {err}
                        </div>
                    )}

                    <button className="btn-primary" style={{ justifyContent: "center", gap: 8 }} onClick={handleParse} disabled={parsing || !raw.trim()}>
                        {parsing ? (
                            <>
                                <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                Processing…
                            </>
                        ) : (
                            <><Send size={13} /> Parse Documentation</>
                        )}
                    </button>

                    {parsing && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {STAGES.map(s => (
                                <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "hsl(0 0% 35%)" }}>
                                    <ArrowRight size={10} style={{ color: "hsl(142 71% 45%)", opacity: 0.7 }} />
                                    {s}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Output panel */}
                <div className="surface" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, minHeight: 380 }}>
                    {!ticket ? (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "hsl(0 0% 25%)", textAlign: "center" }}>
                            <Zap size={28} style={{ opacity: 0.3 }} />
                            <p style={{ fontSize: 12 }}>Output will appear here</p>
                        </div>
                    ) : (
                        <>
                            {/* Ticket meta row */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "hsl(142 71% 50%)", background: "hsl(142 71% 45% / 0.1)", padding: "2px 8px", borderRadius: 4, border: "1px solid hsl(142 71% 45% / 0.2)" }}>
                                        {ticket.ticketId}
                                    </span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: priorityColor[ticket.priority] }}>{ticket.priority}</span>
                                    <span style={{ fontSize: 11, color: "hsl(0 0% 35%)" }}>{ticket.estimatedStoryPoints} SP</span>
                                </div>
                                <button className="btn-ghost" style={{ padding: "2px 8px", fontSize: 11 }} onClick={copy}>
                                    {copied ? <><Check size={11} style={{ color: "hsl(142 71% 55%)" }} /> Copied</> : <><Copy size={11} /> Copy</>}
                                </button>
                            </div>

                            {/* Tab bar */}
                            <div style={{ display: "flex", gap: 2, borderBottom: "1px solid hsl(0 0% 14%)", paddingBottom: 0 }}>
                                {TABS.map(({ key, label }) => (
                                    <TabButton key={key} k={key} current={tab} label={label} onClick={() => setTab(key)} />
                                ))}
                            </div>

                            {/* Tab content */}
                            <div style={{ flex: 1, overflow: "auto" }}>
                                {tab === "summary" && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        <div>
                                            <p style={{ fontSize: 10, color: "hsl(0 0% 35%)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Summary</p>
                                            <p style={{ fontSize: 13, fontWeight: 600, color: "hsl(0 0% 85%)", lineHeight: 1.4 }}>{ticket.summary}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: 10, color: "hsl(0 0% 35%)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Description</p>
                                            <p style={{ fontSize: 12, color: "hsl(0 0% 50%)", lineHeight: 1.6, maxHeight: 120, overflow: "auto" }}>{ticket.description}</p>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontSize: 10, color: "hsl(0 0% 35%)" }}>Endpoint:</span>
                                            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "hsl(38 92% 60%)" }}>
                                                {ticket.jsonSchema.method} {ticket.jsonSchema.endpoint}
                                            </span>
                                        </div>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                            {ticket.labels.map(l => (
                                                <span key={l} style={{ fontSize: 10, padding: "2px 6px", background: "hsl(0 0% 13%)", border: "1px solid hsl(0 0% 18%)", borderRadius: 4, color: "hsl(0 0% 40%)", fontFamily: "monospace" }}>
                                                    #{l}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {tab === "criteria" && ticket.acceptanceCriteria.map((ac, i) => (
                                    <div key={i} style={{ marginBottom: 14, padding: 12, background: "hsl(0 0% 6%)", borderRadius: 6, border: "1px solid hsl(0 0% 14%)" }}>
                                        <p style={{ fontSize: 10, color: "hsl(0 0% 30%)", marginBottom: 8, fontWeight: 600 }}>SCENARIO {i + 1}</p>
                                        {[
                                            { label: "Given", value: ac.given, c: "hsl(213 94% 65%)" },
                                            { label: "When", value: ac.when, c: "hsl(38 92% 60%)" },
                                            { label: "Then", value: ac.then, c: "hsl(142 71% 50%)" },
                                        ].map(({ label, value, c }) => (
                                            <div key={label} style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: 11 }}>
                                                <ChevronRight size={11} style={{ color: c, flexShrink: 0, marginTop: 2 }} />
                                                <div>
                                                    <span style={{ fontWeight: 600, color: c }}>{label}: </span>
                                                    <span style={{ color: "hsl(0 0% 50%)" }}>{value}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}

                                {tab === "schema" && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "hsl(38 92% 60%)" }}>
                                            {ticket.jsonSchema.method} {ticket.jsonSchema.endpoint}
                                        </div>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                            <thead>
                                                <tr>
                                                    {["Field", "Type", "Req"].map(h => (
                                                        <th key={h} style={{ textAlign: "left", padding: "4px 8px", color: "hsl(0 0% 35%)", borderBottom: "1px solid hsl(0 0% 14%)" }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[...ticket.jsonSchema.requestBody, ...ticket.jsonSchema.responseBody].map(f => (
                                                    <tr key={f.name}>
                                                        <td style={{ padding: "4px 8px", fontFamily: "monospace", color: "hsl(142 71% 55%)" }}>{f.name}</td>
                                                        <td style={{ padding: "4px 8px", color: "hsl(38 92% 60%)" }}>{f.type}</td>
                                                        <td style={{ padding: "4px 8px", color: f.required ? "hsl(0 84% 60%)" : "hsl(0 0% 30%)" }}>{f.required ? "yes" : "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {tab === "json" && (
                                    <pre className="code-block">{JSON.stringify(ticket, null, 2)}</pre>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    LayoutDashboard,
    Kanban,
    Zap,
    Clock,
    Menu,
    X,
} from "lucide-react";

const NAV_ITEMS = [
    { href: "/dashboard", label: "People", icon: LayoutDashboard },
    { href: "/kanban", label: "Projects", icon: Kanban },
    { href: "/agent", label: "AI Bridge", icon: Zap },
    { href: "/audit-logs", label: "Logs", icon: Clock },
];

export function Navbar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));

    return (
        <header
            style={{
                background: "hsl(0 0% 5%)",
                borderBottom: "1px solid hsl(0 0% 14%)",
            }}
            className="sticky top-0 z-50 w-full"
        >
            <div className="max-w-7xl mx-auto px-4 flex h-12 items-center gap-6">
                {/* Wordmark */}
                <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
                    <div
                        style={{
                            width: 24,
                            height: 24,
                            background: "hsl(142 71% 45%)",
                            borderRadius: 4,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <span style={{ color: "#fff", fontSize: 11, fontWeight: 800, lineHeight: 1 }}>K</span>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "hsl(0 0% 90%)", letterSpacing: "-0.01em" }}>
                        Kizuna
                    </span>
                </Link>

                {/* Divider */}
                <div style={{ width: 1, height: 18, background: "hsl(0 0% 16%)" }} />

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1 flex-1">
                    {NAV_ITEMS.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            style={{
                                fontSize: 13,
                                fontWeight: 500,
                                padding: "4px 10px",
                                borderRadius: 6,
                                color: isActive(href) ? "hsl(0 0% 92%)" : "hsl(0 0% 45%)",
                                background: isActive(href) ? "hsl(0 0% 14%)" : "transparent",
                                transition: "all 0.1s",
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive(href)) {
                                    (e.target as HTMLElement).style.color = "hsl(0 0% 75%)";
                                    (e.target as HTMLElement).style.background = "hsl(0 0% 11%)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive(href)) {
                                    (e.target as HTMLElement).style.color = "hsl(0 0% 45%)";
                                    (e.target as HTMLElement).style.background = "transparent";
                                }
                            }}
                        >
                            {label}
                        </Link>
                    ))}
                </nav>

                {/* Right side: user avatar */}
                <div className="ml-auto hidden md:flex items-center gap-3">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background: "hsl(142 71% 45% / 0.15)",
                                border: "1px solid hsl(142 71% 45% / 0.3)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 600,
                                color: "hsl(142 71% 55%)",
                            }}
                        >
                            TH
                        </div>
                        <span style={{ fontSize: 12, color: "hsl(0 0% 40%)", fontWeight: 500 }}>Admin</span>
                    </div>
                </div>

                {/* Mobile toggle */}
                <button
                    className="md:hidden ml-auto p-1.5 rounded"
                    style={{ color: "hsl(0 0% 45%)" }}
                    onClick={() => setOpen(!open)}
                >
                    {open ? <X size={18} /> : <Menu size={18} />}
                </button>
            </div>

            {/* Mobile menu */}
            {open && (
                <div style={{ borderTop: "1px solid hsl(0 0% 14%)", padding: "8px 16px 12px" }}>
                    {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 10px",
                                borderRadius: 6,
                                fontSize: 13,
                                fontWeight: 500,
                                color: isActive(href) ? "hsl(0 0% 90%)" : "hsl(0 0% 45%)",
                                background: isActive(href) ? "hsl(0 0% 14%)" : "transparent",
                            }}
                        >
                            <Icon size={15} />
                            {label}
                        </Link>
                    ))}
                </div>
            )}
        </header>
    );
}

import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
    title: "Kizuna | HR & Project Management",
    description: "Internal HR and Project Management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body style={{ backgroundColor: "hsl(0 0% 7%)", minHeight: "100vh" }}>
                <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
                    <Navbar />
                    <main style={{ flex: 1, maxWidth: 1280, margin: "0 auto", width: "100%", padding: "32px 16px" }}>
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}

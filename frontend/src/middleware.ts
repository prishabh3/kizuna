import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pass-through middleware — no locale routing needed (English only)
export function middleware(_request: NextRequest) {
    return NextResponse.next();
}

export const config = {
    // Only run middleware on app routes (not static files)
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

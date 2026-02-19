import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";

export interface AuthRequest extends Request {
    user?: {
        id: number;
        email: string;
        role: UserRole;
        name: string;
    };
}

/**
 * Verifies the JWT token and attaches user info to the request.
 * For demo purposes, allows a x-user-role header as a fallback (dev mode).
 */
export const authenticate = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization;

    // Dev fallback: allow x-dev-user header for testing without a real token
    if (process.env.NODE_ENV === "development" && req.headers["x-dev-user"]) {
        try {
            const devUser = JSON.parse(req.headers["x-dev-user"] as string);
            req.user = devUser;
            return next();
        } catch { }
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        // In dev mode, default to an ADMIN user so the UI works out-of-the-box
        if (process.env.NODE_ENV === "development") {
            req.user = {
                id: 1,
                email: "hiroshi.tanaka@kizuna.com",
                role: "ADMIN",
                name: "Hiroshi Tanaka",
            };
            return next();
        }
        res.status(401).json({ success: false, error: "Unauthorized", code: 401 });
        return;
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as {
            id: number;
            email: string;
            role: UserRole;
            name: string;
        };
        req.user = decoded;
        next();
    } catch {
        res
            .status(401)
            .json({ success: false, error: "Invalid or expired token", code: 401 });
    }
};

/**
 * Role-based access control middleware factory.
 * Usage: requireRole('ADMIN') or requireRole('ADMIN', 'MANAGER')
 */
export const requireRole = (...roles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res
                .status(401)
                .json({ success: false, error: "Unauthorized", code: 401 });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: `Forbidden: requires one of [${roles.join(", ")}] role`,
                code: 403,
            });
            return;
        }

        next();
    };
};

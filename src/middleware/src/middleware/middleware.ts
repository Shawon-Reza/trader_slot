import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";

import { auth } from "../../../lib/auth";

declare global {
    namespace Express {
        interface Request {
            user: typeof auth.$Infer.Session.user;
            session: typeof auth.$Infer.Session.session;
        }
    }
}


export const authMiddleware = (...roles: string[]) => {
    return async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            // 1. Get current session
            const session = await auth.api.getSession({
                headers: fromNodeHeaders(req.headers),
            });

            // 2. Authentication check
            if (!session) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            // 3. Session expiration check
            if (new Date() > session.session.expiresAt) {
                return res.status(401).json({
                    success: false,
                    message: "Session expired",
                });
            }

            // 4. Role authorization
            if (roles.length > 0) {
                const activeMode = session?.user?.activeMode;

                if (!activeMode || !roles.includes(activeMode)) {
                    return res.status(403).json({
                        success: false,
                        message: "You do not have permission to access this resource",
                    });
                }
            }

            // 5. Attach authenticated information to request
            req.user = session.user;
            req.session = session.session;

            // 6. Continue
            return next();

        } catch (error) {
            return next(error);
        }
    };
};
import {
    Router,
    type NextFunction,
    type Request,
    type Response,
} from "express";

import { prisma } from "../../lib/prisma";

export const activeMode = Router();

activeMode.post(
    "/toggle",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log("API called");

            const userID = req.user.id;

            const user = await prisma.user.findUnique({
                where: {
                    id: userID,
                },
                select: {
                    id: true,
                    email: true,
                    activeMode: true,
                },
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }

            const newActiveMode =
                user.activeMode === "CUSTOMER"
                    ? "TRADER"
                    : "CUSTOMER";

            const result = await prisma.user.update({
                where: {
                    id: userID,
                },
                data: {
                    activeMode: newActiveMode,
                },
                select: {
                    id: true,
                    email: true,
                    activeMode: true,
                },
            });

            return res.status(200).json({
                success: true,
                message: "Active mode changed successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
);
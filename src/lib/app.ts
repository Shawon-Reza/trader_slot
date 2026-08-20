
import { toNodeHandler } from "better-auth/node";
import express from "express";
import { auth } from "./auth";
import cors from "cors";
import { prisma } from "./prisma";
import { globalErrorHandler } from "../middleware/src/middleware/globalErrorHandler";
import { chatRoutes } from "../modules/chat/chat.routes";
import { workAreaRoutes } from "../modules/workArea/workArea.routes";
import { bookingRoutes } from "../modules/booking/booking.routes";
import { stripeRoutes } from "../modules/stripe/stripe.routes";
import { traderRoute } from "../modules/trader/trader.route";
import { activeMode } from "../modules/activeMode/activeMode.toggle";
import { authMiddleware } from "../middleware/src/middleware/middleware";

export const app = express()


app.get("/", (req, res) => {
    // res.send("Trader Platform API is running........");
    res.status(200).json({
        success: true,
        status: "ok",
        message: "TradeSlot API is healthy",
        timestamp: new Date().toISOString(),
    });
});
//  Server Health Check Endpoint
app.get("/api/health", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            success: true,
            status: "healthy",
            services: {
                api: "up",
                database: "up",
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: "unhealthy",
            services: {
                api: "up",
                database: "down",
            },
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
        });
    }
});

app.use(express.json());
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,

}));


//  ================ Routes ===============
app.all('/api/auth/{*any}', toNodeHandler(auth));

app.use("/api/chat", chatRoutes);
app.use("/api/work-areas", workAreaRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/stripe", stripeRoutes);
app.use("/api/trader", traderRoute);
app.use("/api/activeMode", authMiddleware(), activeMode);

//  Global Error Handler Middleware
app.use(globalErrorHandler);
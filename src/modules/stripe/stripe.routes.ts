import express from "express";
import { stripeController } from "./stripe.controller";

const router = express.Router();

router.post("/connect/account", stripeController.createConnectAccount);
router.post("/connect/account-link", stripeController.createAccountLink);
router.get("/connect/account/:stripeAccountId/status", stripeController.getAccountStatus);
router.post("/payment-intent", stripeController.createPaymentIntent);
router.post("/webhook", express.raw({ type: "application/json" }), stripeController.stripeWebhook);

export { router as stripeRoutes };
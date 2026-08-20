import express from "express";
import { bookingController } from "./booking.controller";

const router = express.Router();

router.post("/", bookingController.create);
router.get("/:id", bookingController.getById);
router.get("/trader/:traderId", bookingController.listByTrader);
router.get("/customer/:customerId", bookingController.listByCustomer);
router.get("/availability/:traderId", bookingController.getAvailability);
router.patch("/:id/status", bookingController.updateStatus);
router.delete("/:id", bookingController.cancel);

export { router as bookingRoutes };
import express from "express";
import { workAreaController } from "./workArea.controller";

const router = express.Router();

router.post("/", workAreaController.create);
router.get("/all", workAreaController.allWorkArea);
router.get("/date", workAreaController.getByTraderAndDate);
router.get("/trader/:traderId", workAreaController.listByTrader);
router.patch("/:id", workAreaController.update);
router.delete("/:id", workAreaController.delete);

export { router as workAreaRoutes };
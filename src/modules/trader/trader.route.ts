import { Router } from "express";
import { app } from "../../lib/app";
import { traderController } from "./trader.controller";

export const traderRoute = Router()

traderRoute.get("/traderExistance", traderController.getTraderexistance)
traderRoute.post("/createProfile", traderController.createProfile)
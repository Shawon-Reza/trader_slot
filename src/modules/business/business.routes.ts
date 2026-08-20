import { Router } from "express";
import { businessController } from "./business.controllers";

export const businessRoute = Router()

businessRoute.get("/lists", businessController.getBusinessList)
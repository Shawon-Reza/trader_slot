import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { traderServices } from "./trader.service";



export const traderController = {

    async getTraderexistance(req: Request, res: Response, next: NextFunction) {
        const userId = req.user.id

        const result = await traderServices.getTraderexistance(userId)

        if (result) {
            res.status(200).json({
                success: true,
                traderExistance: true,
                data: result
            })
        }
        res.status(200).json({
            success: false,
            traderExistance: false
        })
    }






}


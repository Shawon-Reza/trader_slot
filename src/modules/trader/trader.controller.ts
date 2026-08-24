import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { traderServices } from "./trader.service";



export const traderController = {

    async getTraderexistance(req: Request, res: Response, next: NextFunction) {
        const userId = req.user.id
        const result = await traderServices.getTraderexistance(userId)

        if (!result) {
            return res.status(200).json({
                success: false,
                traderExistance: false
            })
        }

        res.status(200).json({
            success: true,
            traderExistance: true,
            data: result
        })
    },


    async createProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const businessId = req.body.businessType
            const userId = req.user.id



            const result = await traderServices.createProfile({
                businessId,
                userId
            })
            if (result) {
                res.status(200).json({
                    success: true,
                    message: "Your trader profile is ready now",
                    data: result
                })
            }
            res.status(500).json({
                success: false,
                message: "Trader profile already exist",
                data: result
            })

        } catch (error) {
            next(error)
            res.status(500).json({
                success: false,
                message: "Failed to create trader account",
                error: error
            })

        }


    }









}


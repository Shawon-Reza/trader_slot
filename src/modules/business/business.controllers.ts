
import type { NextFunction, Request, Response } from "express";
import { businessService } from "./business.services";

export const businessController = {

    async getBusinessList(req: Request, res: Response, next: NextFunction) {
        try {

            const result = await businessService.getBusinessList()
            if (result) {
                res.status(200).json({
                    success: true,
                    data: result
                })
            }
            // res.status(500).json({
            //     success: false,
            //     data: []
            // })

        } catch (error) {
            res.status(500).json({
                success: false,
                data: []
            })
        }
    }


}
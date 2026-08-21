import type { Request, Response, NextFunction } from "express";
import { workAreaService } from "./workArea.service";

export const workAreaController = {

  async create(req: Request, res: Response, next: NextFunction) {
    try {

      const userId = req.user.id



      const { date, area } = req.body as { traderId: string; date: string; area: string };

      if (!date || !area) {
        return res.status(400).json({ success: false, message: "traderId, date, and area are required" });
      }

      const workArea = await workAreaService.upsert({ userId, date: new Date(date), area });

      res.status(201).json({ success: true, workArea });
    } catch (error) {
      next(error);
    }
  },


  async allWorkArea(req: Request, res: Response, next: NextFunction) {
    try {

      const userId = req.user.id

      const workArea = await workAreaService.allWorkArea(userId);

      res.status(201).json(
        {
          success: true,
          message: "Successfully fetch work-are list",
          data: workArea
        }
      );
    } catch (error) {
      next(error);
    }
  },




  async getByTraderAndDate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id

      const date = req.query.date
      console.log(date)

      if (typeof date !== "string") {
        return res.status(400).json({
          message: "Invalid date",
        });
      }


      if (!date) {
        return res.status(400).json({ success: false, message: "Date required" });
      }

      const workArea = await workAreaService.getByTraderAndDate(userId, date);

      if (!workArea) {
        return res.status(404).json({ success: false, message: "Work area not found" });
      }

      res.status(200).json({ success: true, workArea });
    } catch (error) {
      next(error);
    }
  },


  async listByTrader(req: Request, res: Response, next: NextFunction) {
    try {
      const traderId = req.params.traderId as string;
      const { from, to } = req.query as { from?: string; to?: string };

      const workAreas = await workAreaService.listByTrader(
        traderId,
        from ? new Date(from) : undefined,
        to ? new Date(to) : undefined
      );

      res.status(200).json({ success: true, workAreas });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { area } = req.body as { area?: string };

      if (!area) {
        return res.status(400).json({ success: false, message: "area is required" });
      }

      const workArea = await workAreaService.update(id, { area });

      if (!workArea) {
        return res.status(404).json({ success: false, message: "Work area not found" });
      }

      res.status(200).json({ success: true, workArea });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await workAreaService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
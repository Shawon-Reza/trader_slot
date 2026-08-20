import type { Request, Response, NextFunction } from "express";
import { workAreaService } from "./workArea.service";

export const workAreaController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { traderId, date, area } = req.body as { traderId: string; date: string; area: string };

      if (!traderId || !date || !area) {
        return res.status(400).json({ success: false, message: "traderId, date, and area are required" });
      }

      const workArea = await workAreaService.upsert({ traderId, date: new Date(date), area });

      res.status(201).json({ success: true, workArea });
    } catch (error) {
      next(error);
    }
  },

  async getByTraderAndDate(req: Request, res: Response, next: NextFunction) {
    try {
      const { traderId, date } = req.query as { traderId: string; date: string };

      if (!traderId || !date) {
        return res.status(400).json({ success: false, message: "traderId and date query params required" });
      }

      const workArea = await workAreaService.getByTraderAndDate(traderId, new Date(date));

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
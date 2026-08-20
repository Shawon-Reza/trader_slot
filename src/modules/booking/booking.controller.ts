import type { Request, Response, NextFunction } from "express";
import { bookingService } from "./booking.service";
import { BookingStatus } from "../../../generated/prisma/client";

export const bookingController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { traderId, customerId, channel, startAt, endAt, bookingFee, currency } = req.body as {
        traderId: string;
        customerId: string;
        channel: string;
        startAt: string;
        endAt: string;
        bookingFee: number;
        currency?: string;
      };

      if (!traderId || !customerId || !channel || !startAt || !endAt || !bookingFee) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }

      const booking = await bookingService.create({
        traderId,
        customerId,
        channel: channel as any,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        bookingFee,
        currency: currency ?? "gbp",
      });

      res.status(201).json({ success: true, booking });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const booking = await bookingService.getById(id);

      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      res.status(200).json({ success: true, booking });
    } catch (error) {
      next(error);
    }
  },

  async listByTrader(req: Request, res: Response, next: NextFunction) {
    try {
      const traderId = req.params.traderId as string;
      const { status, from, to } = req.query as { status?: string; from?: string; to?: string };

      const bookings = await bookingService.listByTrader(
        traderId,
        status as BookingStatus | undefined,
        from ? new Date(from) : undefined,
        to ? new Date(to) : undefined
      );

      res.status(200).json({ success: true, bookings });
    } catch (error) {
      next(error);
    }
  },

  async listByCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const customerId = req.params.customerId as string;
      const bookings = await bookingService.listByCustomer(customerId);
      res.status(200).json({ success: true, bookings });
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status } = req.body as { status: string };

      if (!status) {
        return res.status(400).json({ success: false, message: "status is required" });
      }

      const booking = await bookingService.updateStatus(id, { status: status as BookingStatus });

      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      res.status(200).json({ success: true, booking });
    } catch (error) {
      next(error);
    }
  },

  async getAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const traderId = req.params.traderId as string;
      const { date, durationMinutes } = req.query as { date: string; durationMinutes?: string };

      if (!date) {
        return res.status(400).json({ success: false, message: "date query param required" });
      }

      const availability = await bookingService.getAvailability({
        traderId,
        date: new Date(date),
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 60,
      });

      res.status(200).json({ success: true, availability });
    } catch (error) {
      next(error);
    }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const booking = await bookingService.cancel(id);

      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      res.status(200).json({ success: true, booking });
    } catch (error) {
      next(error);
    }
  },
};
import { PrismaClient } from "../../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { CreateBookingInput, BookingResponse, SlotAvailabilityInput, SlotAvailabilityResponse, BookingStatusUpdateInput } from "./booking.types";
import type { Booking as BookingModel } from "../../../generated/prisma/client";
import { BookingStatus, Channel, PaymentStatus } from "../../../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const TRAVEL_BUFFER_MINUTES = 30;

function toResponse(booking: BookingModel & { payment?: { id: string; amount: number; currency: string; status: PaymentStatus; platformFee: number; stripePaymentIntentId: string | null } | null }): BookingResponse {
  return {
    id: booking.id,
    traderId: booking.traderId,
    customerId: booking.customerId,
    channel: booking.channel,
    startAt: booking.startAt,
    endAt: booking.endAt,
    status: booking.status,
    bookingFee: booking.bookingFee,
    currency: booking.currency,
    payment: booking.payment ? {
      id: booking.payment.id,
      amount: booking.payment.amount,
      currency: booking.payment.currency,
      status: booking.payment.status,
      platformFee: booking.payment.platformFee,
      stripePaymentIntentId: booking.payment.stripePaymentIntentId,
    } : null,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export const bookingService = {
  async create(input: CreateBookingInput): Promise<BookingResponse> {
    const bufferedStart = addMinutes(input.startAt, -TRAVEL_BUFFER_MINUTES);
    const bufferedEnd = addMinutes(input.endAt, TRAVEL_BUFFER_MINUTES);

    const conflict = await prisma.booking.findFirst({
      where: {
        traderId: input.traderId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        OR: [
          { startAt: { lt: bufferedEnd }, endAt: { gt: bufferedStart } },
        ],
      },
    });

    if (conflict) {
      throw new Error("Time slot conflicts with existing booking");
    }

    const booking = await prisma.booking.create({
      data: {
        traderId: input.traderId,
        customerId: input.customerId,
        channel: input.channel,
        startAt: input.startAt,
        endAt: input.endAt,
        status: BookingStatus.CONFIRMED,
        bookingFee: input.bookingFee,
        currency: input.currency ?? "gbp",
      },
      include: { payment: true },
    });

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: input.bookingFee,
        currency: input.currency ?? "gbp",
        status: PaymentStatus.PENDING,
        platformFee: Math.round(input.bookingFee * 0.1),
      },
    });

    const created = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { payment: true },
    });

    return toResponse(created!);
  },

  async getById(id: string): Promise<BookingResponse | null> {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { payment: true },
    });
    return booking ? toResponse(booking) : null;
  },

  async listByTrader(traderId: string, status?: BookingStatus, from?: Date, to?: Date): Promise<BookingResponse[]> {
    const where: Record<string, unknown> = { traderId };
    if (status) where.status = status;
    if (from || to) {
      where.startAt = {};
      if (from) (where.startAt as Record<string, Date>).gte = from;
      if (to) (where.startAt as Record<string, Date>).lte = to;
    }
    const bookings = await prisma.booking.findMany({
      where,
      include: { payment: true },
      orderBy: { startAt: "asc" },
    });
    return bookings.map(toResponse);
  },

  async listByCustomer(customerId: string): Promise<BookingResponse[]> {
    const bookings = await prisma.booking.findMany({
      where: { customerId },
      include: { payment: true },
      orderBy: { startAt: "asc" },
    });
    return bookings.map(toResponse);
  },

  async updateStatus(id: string, input: BookingStatusUpdateInput): Promise<BookingResponse | null> {
    const booking = await prisma.booking.update({
      where: { id },
      data: { status: input.status },
      include: { payment: true },
    });
    return toResponse(booking);
  },

  async getAvailability(input: SlotAvailabilityInput): Promise<SlotAvailabilityResponse> {
    const { start, end } = getDayBounds(input.date);
    const duration = input.durationMinutes ?? 60;

    const workArea = await prisma.workArea.findFirst({
      where: { traderId: input.traderId, date: { gte: start, lte: end } },
    });

    if (!workArea) {
      return { date: input.date, slots: [] };
    }

    const existingBookings = await prisma.booking.findMany({
      where: {
        traderId: input.traderId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        startAt: { gte: start, lte: end },
      },
      orderBy: { startAt: "asc" },
    });

    const slots: SlotAvailabilityResponse["slots"] = [];
    const dayStart = new Date(start);
    dayStart.setHours(8, 0, 0, 0);
    const dayEnd = new Date(start);
    dayEnd.setHours(20, 0, 0, 0);

    let current = new Date(dayStart);
    while (addMinutes(current, duration) <= dayEnd) {
      const slotStart = new Date(current);
      const slotEnd = addMinutes(current, duration);
      const bufferedStart = addMinutes(slotStart, -TRAVEL_BUFFER_MINUTES);
      const bufferedEnd = addMinutes(slotEnd, TRAVEL_BUFFER_MINUTES);

      const hasConflict = existingBookings.some(b =>
        b.startAt < bufferedEnd && b.endAt > bufferedStart
      );

      slots.push({
        startAt: slotStart,
        endAt: slotEnd,
        available: !hasConflict,
      });

      current = addMinutes(current, 30);
    }

    return { date: input.date, slots };
  },

  async cancel(id: string): Promise<BookingResponse | null> {
    const booking = await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
      include: { payment: true },
    });

    if (booking.payment) {
      await prisma.payment.update({
        where: { id: booking.payment.id },
        data: { status: PaymentStatus.REFUNDED },
      });
    }

    return toResponse(booking);
  },
};
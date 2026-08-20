import type { Booking, BookingStatus, Channel, PaymentStatus } from "../../../generated/prisma/client";

export interface CreateBookingInput {
  traderId: string;
  customerId: string;
  channel: Channel;
  startAt: Date;
  endAt: Date;
  bookingFee: number;
  currency?: string;
}

export interface BookingResponse {
  id: string;
  traderId: string;
  customerId: string;
  channel: Channel;
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
  bookingFee: number;
  currency: string;
  payment?: {
    id: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    platformFee: number;
    stripePaymentIntentId: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SlotAvailabilityInput {
  traderId: string;
  date: Date;
  durationMinutes?: number;
}

export interface SlotAvailabilityResponse {
  date: Date;
  slots: Array<{
    startAt: Date;
    endAt: Date;
    available: boolean;
  }>;
}

export interface BookingStatusUpdateInput {
  status: BookingStatus;
}
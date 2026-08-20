import type { WorkArea } from "../../../generated/prisma/client";

export interface CreateWorkAreaInput {
  traderId: string;
  date: Date;
  area: string;
}

export interface UpdateWorkAreaInput {
  area?: string;
}

export interface WorkAreaResponse {
  id: string;
  traderId: string;
  date: Date;
  area: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkAreaWithTrader extends WorkAreaResponse {
  trader: {
    id: string;
    userId: string;
    businessId: string;
    stripeAccountId: string | null;
  };
}
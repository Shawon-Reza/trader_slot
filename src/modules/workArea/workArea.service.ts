import { PrismaClient } from "../../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { CreateWorkAreaInput, UpdateWorkAreaInput, WorkAreaResponse, WorkAreaWithTrader } from "./workArea.types";
import type { WorkArea as WorkAreaModel } from "../../../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function toResponse(wa: WorkAreaModel): WorkAreaResponse {
  return {
    id: wa.id,
    traderId: wa.traderId,
    date: wa.date,
    area: wa.area,
    createdAt: wa.createdAt,
    updatedAt: wa.updatedAt,
  };
}

export const workAreaService = {
  async create(input: CreateWorkAreaInput): Promise<WorkAreaResponse> {
    const workArea = await prisma.workArea.create({
      data: {
        traderId: input.traderId,
        date: input.date,
        area: input.area,
      },
    });
    return toResponse(workArea);
  },

  async upsert(input: CreateWorkAreaInput): Promise<WorkAreaResponse> {
    const workArea = await prisma.workArea.upsert({
      where: {
        traderId_date: {
          traderId: input.traderId,
          date: input.date,
        },
      },
      create: {
        traderId: input.traderId,
        date: input.date,
        area: input.area,
      },
      update: {
        area: input.area,
      },
    });
    return toResponse(workArea);
  },

  async getByTraderAndDate(traderId: string, date: Date): Promise<WorkAreaResponse | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const workArea = await prisma.workArea.findFirst({
      where: {
        traderId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });
    return workArea ? toResponse(workArea) : null;
  },

  async getById(id: string): Promise<WorkAreaWithTrader | null> {
    const workArea = await prisma.workArea.findUnique({
      where: { id },
      include: { trader: true },
    });
    if (!workArea) return null;
    return {
      ...toResponse(workArea),
      trader: {
        id: workArea.trader.id,
        userId: workArea.trader.userId,
        businessId: workArea.trader.businessId,
        stripeAccountId: workArea.trader.stripeAccountId,
      },
    };
  },

  async listByTrader(traderId: string, from?: Date, to?: Date): Promise<WorkAreaResponse[]> {
    const where: Record<string, unknown> = { traderId };
    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, Date>).gte = from;
      if (to) (where.date as Record<string, Date>).lte = to;
    }
    const workAreas = await prisma.workArea.findMany({
      where,
      orderBy: { date: "asc" },
    });
    return workAreas.map(toResponse);
  },

  async update(id: string, input: UpdateWorkAreaInput): Promise<WorkAreaResponse | null> {
    const data: Record<string, string> = {};
    if (input.area !== undefined) data.area = input.area;

    const workArea = await prisma.workArea.update({
      where: { id },
      data,
    });
    return toResponse(workArea);
  },

  async delete(id: string): Promise<boolean> {
    await prisma.workArea.delete({ where: { id } });
    return true;
  },
};
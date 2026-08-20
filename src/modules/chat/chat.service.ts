import { PrismaClient } from "../../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { ConversationWithMessages, BookingRequest, BookingResponse, ChatbotWebhookPayload, WhatsAppWebhookPayload, NormalizedMessage, IncomingMessage } from "./chat.types";
import { Channel, MessageSender, ConversationStatus, BookingStatus, PaymentStatus } from "../../../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const TRAVEL_BUFFER_MINUTES = 30;
const DEFAULT_JOB_DURATION_MINUTES = 60;
const FLAT_BOOKING_FEE = 2000;
const CURRENCY = "gbp";

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function findOverlappingBooking(traderId: string, startAt: Date, endAt: Date) {
  return prisma.booking.findFirst({
    where: {
      traderId,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      OR: [
        { startAt: { lt: endAt }, endAt: { gt: startAt } },
      ],
    },
  });
}

async function getOrCreateCustomer(channel: Channel, identifier: string, name?: string, phone?: string, email?: string) {
  let customer = await prisma.customer.findFirst({
    where: channel === Channel.WHATSAPP ? { phone: identifier } : { email: identifier },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: name || (channel === Channel.WHATSAPP ? `WhatsApp User ${identifier.slice(-4)}` : `Chat User ${identifier.slice(0, 8)}`),
        phone: channel === Channel.WHATSAPP ? identifier : phone ?? null,
        email: channel === Channel.CHATBOT ? identifier : email ?? null,
      },
    });
  }

  return customer;
}

async function getOrCreateConversation(customerId: string, channel: Channel, externalId: string) {
  let conversation = await prisma.conversation.findFirst({
    where: { customerId, channel, externalId },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { customerId, channel, externalId, status: ConversationStatus.ACTIVE },
    });
  }

  return conversation;
}

async function saveMessage(conversationId: string, message: NormalizedMessage) {
  return prisma.message.create({
    data: {
      conversationId,
      sender: message.sender,
      content: message.content,
      externalId: message.externalId ?? null,
      timestamp: message.timestamp,
    },
  });
}

async function processBookingRequest(conversationId: string, customerId: string, request: BookingRequest, channel: Channel): Promise<BookingResponse> {
  const workArea = await prisma.workArea.findFirst({
    where: {
      date: {
        gte: new Date(request.requestedStartAt.setHours(0, 0, 0, 0)),
        lte: new Date(request.requestedStartAt.setHours(23, 59, 59, 999)),
      },
    },
    include: { trader: true },
  });

  if (!workArea) {
    return {
      success: false,
      message: "No trader available for the requested date and area.",
      status: BookingStatus.CANCELLED,
    };
  }

  const trader = workArea.trader;
  const requestedStart = request.requestedStartAt;
  const requestedEnd = request.requestedEndAt || addMinutes(requestedStart, DEFAULT_JOB_DURATION_MINUTES);
  const bufferedStart = addMinutes(requestedStart, -TRAVEL_BUFFER_MINUTES);
  const bufferedEnd = addMinutes(requestedEnd, TRAVEL_BUFFER_MINUTES);

  const conflict = await findOverlappingBooking(trader.id, bufferedStart, bufferedEnd);
  if (conflict) {
    const nextAvailable = addMinutes(conflict.endAt, TRAVEL_BUFFER_MINUTES);
    const proposedEnd = addMinutes(nextAvailable, DEFAULT_JOB_DURATION_MINUTES + 2 * TRAVEL_BUFFER_MINUTES);

    return {
      success: false,
      proposedStartAt: nextAvailable,
      proposedEndAt: proposedEnd,
      message: `Requested slot unavailable. Next available: ${nextAvailable.toLocaleString()}`,
      status: BookingStatus.PENDING,
      bookingFee: FLAT_BOOKING_FEE,
      currency: CURRENCY,
    };
  }

  const booking = await prisma.booking.create({
    data: {
      traderId: trader.id,
      customerId,
      channel,
      startAt: requestedStart,
      endAt: requestedEnd,
      status: BookingStatus.CONFIRMED,
      bookingFee: FLAT_BOOKING_FEE,
      currency: CURRENCY,
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: FLAT_BOOKING_FEE,
      currency: CURRENCY,
      status: PaymentStatus.PENDING,
      platformFee: Math.round(FLAT_BOOKING_FEE * 0.1),
    },
  });

  return {
    success: true,
    bookingId: booking.id,
    proposedStartAt: requestedStart,
    proposedEndAt: requestedEnd,
    message: `Booking confirmed for ${requestedStart.toLocaleString()} - ${requestedEnd.toLocaleString()}`,
    status: BookingStatus.CONFIRMED,
    bookingFee: FLAT_BOOKING_FEE,
    currency: CURRENCY,
  };
}

function parseBookingRequest(content: string): BookingRequest | null {
  const lower = content.toLowerCase();
  const bookingKeywords = ["book", "schedule", "appointment", "slot", "available"];

  if (!bookingKeywords.some(k => lower.includes(k))) {
    return null;
  }

  const dateTimeRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})[\sT]?(\d{1,2}:\d{2})?/;
  const match = content.match(dateTimeRegex);

  if (!match || !match[1]) {
    return { requestedStartAt: new Date(Date.now() + 3600000) };
  }

  const dateStr = match[1];
  const timeStr = match[2];
  const dateParts = dateStr.split(/[\/\-]/).map(Number);
  const day = dateParts[0] ?? 1;
  const month = dateParts[1] ?? 1;
  const year = dateParts[2] ?? new Date().getFullYear();
  const timeParts = timeStr?.split(":").map(Number) ?? [];
  const hours = timeParts[0] ?? 9;
  const minutes = timeParts[1] ?? 0;

  const requestedStartAt = new Date(year < 100 ? 2000 + year : year, month - 1, day, hours, minutes);

  return { requestedStartAt };
}

export const chatService = {
  async processIncomingMessage(message: IncomingMessage): Promise<NormalizedMessage> {
    const customer = await getOrCreateCustomer(
      message.channel,
      message.senderId,
      message.senderName ?? undefined,
      message.channel === Channel.WHATSAPP ? message.senderId : undefined,
      message.channel === Channel.CHATBOT ? message.senderId : undefined
    );

    const conversation = await getOrCreateConversation(customer.id, message.channel, message.externalId);

    const normalized: NormalizedMessage = {
      sender: MessageSender.CUSTOMER,
      content: message.content,
      timestamp: message.timestamp || new Date(),
      externalId: message.externalId ?? null,
      channel: message.channel,
      customerIdentifier: message.senderId,
      customerName: message.senderName ?? null,
    };

    await saveMessage(conversation.id, normalized);

    const bookingRequest = parseBookingRequest(message.content);
    if (bookingRequest) {
      const response = await processBookingRequest(conversation.id, customer.id, bookingRequest, message.channel);

      const botResponse: NormalizedMessage = {
        sender: MessageSender.BOT,
        content: response.message,
        timestamp: new Date(),
        externalId: null,
        channel: message.channel,
        customerIdentifier: message.senderId,
        customerName: null,
      };

      await saveMessage(conversation.id, botResponse);
    }

    return normalized;
  },

  async handleChatbotWebhook(payload: ChatbotWebhookPayload): Promise<NormalizedMessage[]> {
    const messages: IncomingMessage = {
      channel: Channel.CHATBOT,
      externalId: payload.sessionId,
      content: payload.message,
      senderId: payload.userId || `chatbot_${payload.sessionId}`,
      senderName: null,
      timestamp: new Date(),
      metadata: payload.metadata ?? {},
    };

    const result = await this.processIncomingMessage(messages);
    return [result];
  },

  async handleWhatsAppWebhook(payload: WhatsAppWebhookPayload): Promise<NormalizedMessage[]> {
    const results: NormalizedMessage[] = [];

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const { messages, contacts } = change.value;
        if (!messages) continue;

        const contact = contacts?.[0];
        const contactName = contact?.profile?.name;

        for (const msg of messages) {
          if (msg.type !== "text" || !msg.text?.body) continue;

          const incoming: IncomingMessage = {
            channel: Channel.WHATSAPP,
            externalId: msg.id,
            content: msg.text.body,
            senderId: msg.from,
            senderName: contactName ?? null,
            timestamp: new Date(parseInt(msg.timestamp, 10) * 1000),
            metadata: {},
          };

          const result = await this.processIncomingMessage(incoming);
          results.push(result);
        }
      }
    }

    return results;
  },

  async getConversation(conversationId: string): Promise<ConversationWithMessages | null> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        customer: true,
        messages: { orderBy: { timestamp: "asc" } },
      },
    });

    if (!conversation) return null;

    return {
      id: conversation.id,
      customerId: conversation.customerId,
      channel: conversation.channel,
      status: conversation.status,
      externalId: conversation.externalId,
      messages: conversation.messages.map((m) => ({
        sender: m.sender,
        content: m.content,
        timestamp: m.timestamp,
        externalId: m.externalId ?? null,
        channel: conversation.channel,
        customerIdentifier: conversation.customerId,
        customerName: null,
      })),
      customer: {
        id: conversation.customer.id,
        name: conversation.customer.name,
        phone: conversation.customer.phone,
        email: conversation.customer.email,
      },
    };
  },

  async sendTraderMessage(conversationId: string, content: string): Promise<NormalizedMessage> {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new Error("Conversation not found");

    const message: NormalizedMessage = {
      sender: MessageSender.TRADER,
      content,
      timestamp: new Date(),
      externalId: null,
      channel: conversation.channel,
      customerIdentifier: conversation.customerId,
      customerName: null,
    };

    await saveMessage(conversationId, message);
    return message;
  },
};
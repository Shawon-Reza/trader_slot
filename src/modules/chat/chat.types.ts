import type { Channel, MessageSender, ConversationStatus, BookingStatus } from "../../../generated/prisma/client";

export interface NormalizedMessage {
  sender: MessageSender;
  content: string;
  timestamp: Date;
  externalId: string | null;
  channel: Channel;
  customerIdentifier: string;
  customerName: string | null;
}

export interface IncomingMessage {
  channel: Channel;
  externalId: string;
  content: string;
  senderId: string;
  senderName: string | null;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface ConversationWithMessages {
  id: string;
  customerId: string;
  channel: Channel;
  status: ConversationStatus;
  externalId: string | null;
  messages: NormalizedMessage[];
  customer: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  };
}

export interface BookingRequest {
  requestedStartAt: Date;
  requestedEndAt?: Date;
  workArea?: string;
  notes?: string;
}

export interface BookingResponse {
  success: boolean;
  bookingId?: string;
  proposedStartAt?: Date;
  proposedEndAt?: Date;
  message: string;
  status: BookingStatus;
  bookingFee?: number;
  currency?: string;
}

export interface ChatbotWebhookPayload {
  message: string;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface WhatsAppWebhookPayload {
  entry: Array<{
    changes: Array<{
      value: {
        messages?: Array<{
          id: string;
          from: string;
          timestamp: string;
          text?: { body: string };
          type: string;
        }>;
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
      };
    }>;
  }>;
}

export type ChannelHandler = (payload: unknown) => Promise<NormalizedMessage[]>;

export interface ChannelConfig {
  channel: Channel;
  handler: ChannelHandler;
  verifyToken?: string;
}
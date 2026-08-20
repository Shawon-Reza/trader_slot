import type { Request, Response, NextFunction } from "express";
import { chatService } from "./chat.service";
import type { ChatbotWebhookPayload, WhatsAppWebhookPayload } from "./chat.types";

export const chatController = {
  async chatbotWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body as ChatbotWebhookPayload;

      if (!payload.message || !payload.sessionId) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: message, sessionId",
        });
      }

      const results = await chatService.handleChatbotWebhook(payload);

      res.status(200).json({
        success: true,
        messagesProcessed: results.length,
        responses: results.map(m => ({ content: m.content, timestamp: m.timestamp })),
      });
    } catch (error) {
      next(error);
    }
  },

  async whatsappWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const mode = req.query["hub.mode"] as string | undefined;
      const token = req.query["hub.verify_token"] as string | undefined;
      const challenge = req.query["hub.challenge"] as string | undefined;

      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

      if (mode === "subscribe" && token === verifyToken && challenge) {
        console.log("WhatsApp webhook verified");
        return res.status(200).send(challenge);
      }

      if (req.method === "POST") {
        const payload = req.body as WhatsAppWebhookPayload;

        if (!payload.entry) {
          return res.status(400).json({ success: false, message: "Invalid payload" });
        }

        const results = await chatService.handleWhatsAppWebhook(payload);

        return res.status(200).json({
          success: true,
          messagesProcessed: results.length,
        });
      }

      return res.status(403).send("Forbidden");
    } catch (error) {
      next(error);
    }
  },

  async getConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const conversationId = req.params.conversationId as string;

      const conversation = await chatService.getConversation(conversationId);

      if (!conversation) {
        return res.status(404).json({ success: false, message: "Conversation not found" });
      }

      res.status(200).json({ success: true, conversation });
    } catch (error) {
      next(error);
    }
  },

  async sendTraderMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const conversationId = req.params.conversationId as string;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ success: false, message: "Content is required" });
      }

      const message = await chatService.sendTraderMessage(conversationId, content);

      res.status(201).json({ success: true, message });
    } catch (error) {
      next(error);
    }
  },
};
import express from "express";
import { chatController } from "./chat.controller";

const router = express.Router();

router.post("/webhook/chatbot", chatController.chatbotWebhook);

router.get("/webhook/whatsapp", chatController.whatsappWebhook);
router.post("/webhook/whatsapp", chatController.whatsappWebhook);

router.get("/conversations/:conversationId", chatController.getConversation);
router.post("/conversations/:conversationId/messages", chatController.sendTraderMessage);

export { router as chatRoutes };
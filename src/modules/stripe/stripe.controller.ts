import type { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import { stripeService, stripe } from "./stripe.service";
import { prisma } from "../../lib/prisma";

export const stripeController = {
  async createConnectAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { traderId, email, businessType, country } = req.body as {
        traderId: string;
        email: string;
        businessType?: "individual" | "company";
        country?: string;
      };

      if (!traderId || !email) {
        return res.status(400).json({ success: false, message: "traderId and email are required" });
      }

      const accountId = await stripeService.createConnectAccount({
        traderId,
        email,
        businessType: businessType ?? "individual",
        country: country ?? "GB",
      });

      res.status(201).json({ success: true, stripeAccountId: accountId });
    } catch (error) {
      next(error);
    }
  },

  async createAccountLink(req: Request, res: Response, next: NextFunction) {
    try {
      const { stripeAccountId } = req.body as { stripeAccountId: string };
      const refreshUrl = req.query.refreshUrl as string;
      const returnUrl = req.query.returnUrl as string;

      if (!stripeAccountId || !refreshUrl || !returnUrl) {
        return res.status(400).json({ success: false, message: "stripeAccountId, refreshUrl, and returnUrl are required" });
      }

      const link = await stripeService.createAccountLink(stripeAccountId, refreshUrl, returnUrl);

      res.status(200).json({ success: true, ...link });
    } catch (error) {
      next(error);
    }
  },

  async getAccountStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const stripeAccountId = req.params.stripeAccountId as string;

      const status = await stripeService.getAccountStatus(stripeAccountId);

      res.status(200).json({ success: true, status });
    } catch (error) {
      next(error);
    }
  },

  async createPaymentIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingId, amount, currency, applicationFeeAmount, stripeAccountId, customerEmail, metadata } = req.body as {
        bookingId: string;
        amount: number;
        currency: string;
        applicationFeeAmount: number;
        stripeAccountId: string;
        customerEmail?: string;
        metadata?: Record<string, string>;
      };

      if (!bookingId || !amount || !currency || !applicationFeeAmount || !stripeAccountId) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }

      const result = await stripeService.createPaymentIntent({
        bookingId,
        amount,
        currency,
        applicationFeeAmount,
        stripeAccountId,
        customerEmail: customerEmail ?? "customer@example.com",
        metadata: metadata ?? {},
      });

      await prisma.payment.update({
        where: { bookingId },
        data: { stripePaymentIntentId: result.paymentIntentId },
      });

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async stripeWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers["stripe-signature"] as string;
      const payload = req.body;

      if (!signature) {
        return res.status(400).json({ success: false, message: "Missing stripe-signature header" });
      }

      let event;
      try {
        event = stripeService.constructWebhookEvent(payload, signature);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return res.status(400).json({ success: false, message: "Invalid signature" });
      }

      switch (event.type) {
        case "payment_intent.succeeded":
          await stripeService.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case "payment_intent.payment_failed":
          await stripeService.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case "charge.refunded":
          const charge = event.data.object as Stripe.Charge;
          if (charge.payment_intent) {
            const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent as string);
            await stripeService.handlePaymentIntentRefunded(paymentIntent);
          }
          break;
      }

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  },
};
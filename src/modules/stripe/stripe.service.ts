import Stripe from "stripe";
import { PrismaClient } from "../../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { StripeAccountOnboardingInput, StripeAccountLinkResponse, PaymentIntentInput, PaymentIntentResponse, StripeAccountStatus } from "./stripe.types";
import { PaymentStatus } from "../../../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-07-29.dahlia",
});

const PLATFORM_FEE_PERCENT = 0.1;

export const stripeService = {
  async createConnectAccount(input: StripeAccountOnboardingInput): Promise<string> {
    const trader = await prisma.trader.findUnique({ where: { id: input.traderId } });
    if (!trader) throw new Error("Trader not found");

    if (trader.stripeAccountId) {
      return trader.stripeAccountId;
    }

    const account = await stripe.accounts.create({
      type: "express",
      email: input.email,
      business_type: input.businessType ?? "individual",
      country: input.country ?? "GB",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { traderId: input.traderId },
    });

    await prisma.trader.update({
      where: { id: input.traderId },
      data: { stripeAccountId: account.id },
    });

    return account.id;
  },

  async createAccountLink(stripeAccountId: string, refreshUrl: string, returnUrl: string): Promise<StripeAccountLinkResponse> {
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
    return { url: accountLink.url, expiresAt: accountLink.expires_at };
  },

  async getAccountStatus(stripeAccountId: string): Promise<StripeAccountStatus> {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return {
      id: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: {
        currentlyDue: account.requirements?.currently_due ?? [],
        eventuallyDue: account.requirements?.eventually_due ?? [],
        pastDue: account.requirements?.past_due ?? [],
        pendingVerification: account.requirements?.pending_verification ?? [],
      },
    };
  },

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResponse> {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: input.amount,
      currency: input.currency,
      application_fee_amount: input.applicationFeeAmount,
      payment_method_types: ["card"],
      transfer_data: { destination: input.stripeAccountId },
      metadata: { bookingId: input.bookingId, ...input.metadata },
    };
    if (input.customerEmail) params.receipt_email = input.customerEmail;

    const paymentIntent = await stripe.paymentIntents.create(params);

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  },

  async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return stripe.paymentIntents.confirm(paymentIntentId);
  },

  async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const bookingId = paymentIntent.metadata.bookingId;
    if (!bookingId) return;

    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: PaymentStatus.PAID },
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });
  },

  async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: PaymentStatus.FAILED },
    });
  },

  async handlePaymentIntentRefunded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: PaymentStatus.REFUNDED },
    });
  },

  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  },
};
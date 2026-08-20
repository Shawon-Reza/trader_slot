export interface StripeAccountOnboardingInput {
  traderId: string;
  email: string;
  businessType?: "individual" | "company";
  country?: string;
}

export interface StripeAccountLinkResponse {
  url: string;
  expiresAt: number;
}

export interface PaymentIntentInput {
  bookingId: string;
  amount: number;
  currency: string;
  applicationFeeAmount: number;
  stripeAccountId: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
}

export interface StripeAccountStatus {
  id: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    pendingVerification: string[];
  };
}
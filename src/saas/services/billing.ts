import Stripe from "stripe";
import { queryOne, query } from "../db/connection.js";
import { credit, usdToMicro } from "./credit-manager.js";

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    stripe = new Stripe(key);
  }
  return stripe;
}

export type SubscriptionPlan = "free" | "starter" | "pro" | "enterprise";

const PLAN_DETAILS: Record<
  SubscriptionPlan,
  { priceMonthly: number; includedCreditsUsd: number; marginPercent: number }
> = {
  free: { priceMonthly: 0, includedCreditsUsd: 0.5, marginPercent: 100 },
  starter: { priceMonthly: 15, includedCreditsUsd: 7, marginPercent: 75 },
  pro: { priceMonthly: 40, includedCreditsUsd: 20, marginPercent: 50 },
  enterprise: { priceMonthly: 0, includedCreditsUsd: 0, marginPercent: 50 },
};

export function getPlanDetails(plan: SubscriptionPlan) {
  return PLAN_DETAILS[plan] ?? PLAN_DETAILS.free;
}

export async function createStripeCustomer(params: {
  email: string;
  name?: string;
  tenantId: string;
}): Promise<string> {
  const customer = await getStripe().customers.create({
    email: params.email,
    name: params.name,
    metadata: { tenantId: params.tenantId },
  });
  return customer.id;
}

export async function createCheckoutSession(params: {
  tenantId: string;
  stripeCustomerId: string;
  creditAmountUsd: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const session = await getStripe().checkout.sessions.create({
    customer: params.stripeCustomerId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "OpenClaw Credits",
            description: `$${params.creditAmountUsd.toFixed(2)} in AI credits`,
          },
          unit_amount: Math.round(params.creditAmountUsd * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      tenantId: params.tenantId,
      creditAmountUsd: params.creditAmountUsd.toString(),
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });
  return session.url ?? "";
}

export async function createSubscriptionCheckout(params: {
  tenantId: string;
  stripeCustomerId: string;
  plan: SubscriptionPlan;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const priceId = process.env[`STRIPE_PRICE_${params.plan.toUpperCase()}`];
  if (!priceId) {
    throw new Error(`No Stripe price configured for plan: ${params.plan}`);
  }

  const session = await getStripe().checkout.sessions.create({
    customer: params.stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      tenantId: params.tenantId,
      plan: params.plan,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });
  return session.url ?? "";
}

export async function handleWebhook(
  body: string,
  signature: string,
): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  }

  const event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const tenantId = session.metadata?.tenantId;
      const creditAmountStr = session.metadata?.creditAmountUsd;

      if (tenantId && creditAmountStr) {
        const creditAmountUsd = Number.parseFloat(creditAmountStr);
        if (Number.isFinite(creditAmountUsd) && creditAmountUsd > 0) {
          await credit({
            tenantId,
            amountMicro: usdToMicro(creditAmountUsd),
            description: `Credit purchase: $${creditAmountUsd.toFixed(2)}`,
            referenceType: "stripe_payment",
            referenceId: session.id,
          });
        }
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
      if (subscriptionId) {
        const sub = await queryOne<{ tenant_id: string; plan: string }>(
          "SELECT tenant_id, plan FROM subscriptions WHERE stripe_subscription_id = $1",
          [subscriptionId],
        );
        if (sub) {
          const planDetails = getPlanDetails(sub.plan as SubscriptionPlan);
          if (planDetails.includedCreditsUsd > 0) {
            await credit({
              tenantId: sub.tenant_id,
              amountMicro: usdToMicro(planDetails.includedCreditsUsd),
              description: `Monthly ${sub.plan} plan credits`,
              referenceType: "subscription_credit",
              referenceId: subscriptionId,
            });
          }
        }
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      await query(
        `UPDATE subscriptions SET status = $1, current_period_end = $2
         WHERE stripe_subscription_id = $3`,
        [
          subscription.status,
          subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
          subscription.id,
        ],
      );
      break;
    }
  }
}

export async function getSubscription(tenantId: string) {
  return queryOne<{
    id: string;
    stripe_customer_id: string;
    stripe_subscription_id: string | null;
    plan: string;
    status: string;
    current_period_end: Date | null;
  }>("SELECT * FROM subscriptions WHERE tenant_id = $1", [tenantId]);
}

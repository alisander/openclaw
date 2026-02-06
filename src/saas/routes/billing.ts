import { Hono } from "hono";
import { authMiddleware, type JwtPayload } from "../middleware/auth.js";
import { tenantContextMiddleware, type TenantContext } from "../middleware/tenant-context.js";
import { getBalanceUsd, getLedger } from "../services/credit-manager.js";
import {
  createCheckoutSession,
  createSubscriptionCheckout,
  createStripeCustomer,
  getSubscription,
  handleWebhook,
  type SubscriptionPlan,
} from "../services/billing.js";
import { queryOne, query } from "../db/connection.js";

const billing = new Hono();

// Stripe webhook (no auth - verified by Stripe signature)
billing.post("/webhook", async (c) => {
  const body = await c.req.text();
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  try {
    await handleWebhook(body, signature);
    return c.json({ received: true });
  } catch (err) {
    console.error("[saas-billing] Webhook error:", err);
    return c.json({ error: "Webhook processing failed" }, 400);
  }
});

// Authenticated routes below
billing.use("/*", authMiddleware(), tenantContextMiddleware());

billing.get("/balance", async (c) => {
  const tenant = c.get("tenant") as TenantContext;
  const balanceUsd = await getBalanceUsd(tenant.tenantId);
  return c.json({ balanceUsd });
});

billing.get("/ledger", async (c) => {
  const tenant = c.get("tenant") as TenantContext;
  const limit = Number(c.req.query("limit")) || 50;
  const offset = Number(c.req.query("offset")) || 0;
  const entries = await getLedger(tenant.tenantId, limit, offset);
  return c.json({
    entries: entries.map((e) => ({
      ...e,
      amount: Number(e.amount) / 1_000_000,
      balance_after: Number(e.balance_after) / 1_000_000,
    })),
  });
});

billing.get("/subscription", async (c) => {
  const tenant = c.get("tenant") as TenantContext;
  const sub = await getSubscription(tenant.tenantId);
  return c.json({ subscription: sub });
});

billing.post("/purchase-credits", async (c) => {
  const tenant = c.get("tenant") as TenantContext;
  const user = c.get("user") as JwtPayload;
  const body = await c.req.json<{ amountUsd?: number }>();
  const amountUsd = body.amountUsd;

  if (!amountUsd || amountUsd < 1 || amountUsd > 1000) {
    return c.json({ error: "Amount must be between $1 and $1000" }, 400);
  }

  // Get or create Stripe customer
  let sub = await getSubscription(tenant.tenantId);
  let stripeCustomerId: string;
  if (sub) {
    stripeCustomerId = sub.stripe_customer_id;
  } else {
    stripeCustomerId = await createStripeCustomer({
      email: user.email,
      tenantId: tenant.tenantId,
    });
    await query(
      `INSERT INTO subscriptions (tenant_id, stripe_customer_id, plan, status)
       VALUES ($1, $2, $3, $4)`,
      [tenant.tenantId, stripeCustomerId, tenant.plan, "active"],
    );
  }

  const baseUrl = process.env.OPENCLAW_SAAS_BASE_URL ?? "http://localhost:3001";
  const checkoutUrl = await createCheckoutSession({
    tenantId: tenant.tenantId,
    stripeCustomerId,
    creditAmountUsd: amountUsd,
    successUrl: `${baseUrl}/dashboard/billing?success=true`,
    cancelUrl: `${baseUrl}/dashboard/billing?canceled=true`,
  });

  return c.json({ checkoutUrl });
});

billing.post("/subscribe", async (c) => {
  const tenant = c.get("tenant") as TenantContext;
  const user = c.get("user") as JwtPayload;
  const body = await c.req.json<{ plan?: string }>();
  const plan = body.plan as SubscriptionPlan;

  if (!plan || !["starter", "pro", "enterprise"].includes(plan)) {
    return c.json({ error: "Invalid plan" }, 400);
  }

  let sub = await getSubscription(tenant.tenantId);
  let stripeCustomerId: string;
  if (sub) {
    stripeCustomerId = sub.stripe_customer_id;
  } else {
    stripeCustomerId = await createStripeCustomer({
      email: user.email,
      tenantId: tenant.tenantId,
    });
    await query(
      `INSERT INTO subscriptions (tenant_id, stripe_customer_id, plan, status)
       VALUES ($1, $2, $3, $4)`,
      [tenant.tenantId, stripeCustomerId, plan, "pending"],
    );
  }

  const baseUrl = process.env.OPENCLAW_SAAS_BASE_URL ?? "http://localhost:3001";
  const checkoutUrl = await createSubscriptionCheckout({
    tenantId: tenant.tenantId,
    stripeCustomerId,
    plan,
    successUrl: `${baseUrl}/dashboard/billing?subscribed=true`,
    cancelUrl: `${baseUrl}/dashboard/billing?canceled=true`,
  });

  return c.json({ checkoutUrl });
});

export { billing };

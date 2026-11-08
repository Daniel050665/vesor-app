import { randomBytes } from "node:crypto";
import { query, queryOne } from "./db";

// Modelo de ingresos SIMULADO: planes y suscripciones sin cobros reales ni pasarela de pago.

export const FREE_CHAT_LIMIT = 20;

export const PLANS = {
  gratis: { name: "Gratis", monthly: 0, yearly: 0 },
  premium: { name: "Premium", monthly: 14_900, yearly: 149_000 },
} as const;

export type BillingCycle = "mensual" | "anual";

export type Subscription = {
  id: string;
  plan: "premium";
  billing_cycle: BillingCycle;
  price_cop: number;
  status: "active" | "canceled";
  receipt_code: string;
  started_at: string;
  renews_at: string;
};

export const cop = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export async function activeSubscription(userId: string) {
  return queryOne<Subscription>(
    `select id, plan, billing_cycle, price_cop, status, receipt_code, started_at, renews_at
     from subscriptions where user_id = $1 and status = 'active' and renews_at > now()`,
    [userId]
  );
}

/** Consultas al asistente en el mes calendario actual (hora de Colombia). */
export async function chatQueriesThisMonth(userId: string) {
  const row = await queryOne<{ n: number }>(
    `select count(*)::int as n from activity_log
     where user_id = $1 and type = 'chat_query'
       and created_at >= date_trunc('month', now() at time zone 'America/Bogota') at time zone 'America/Bogota'`,
    [userId]
  );
  return row?.n ?? 0;
}

export async function planStatus(userId: string) {
  const [subscription, used] = await Promise.all([activeSubscription(userId), chatQueriesThisMonth(userId)]);
  const premium = Boolean(subscription);
  return {
    plan: premium ? ("premium" as const) : ("gratis" as const),
    subscription,
    used,
    limit: premium ? null : FREE_CHAT_LIMIT,
    remaining: premium ? null : Math.max(0, FREE_CHAT_LIMIT - used),
  };
}

export async function subscribe(userId: string, cycle: BillingCycle) {
  const price = cycle === "anual" ? PLANS.premium.yearly : PLANS.premium.monthly;
  const receipt = `VSR-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  // Una sola suscripción activa por usuario (índice único parcial en la base de datos).
  await query(`update subscriptions set status = 'canceled', canceled_at = now() where user_id = $1 and status = 'active'`, [userId]);
  return queryOne<Subscription>(
    `insert into subscriptions (user_id, plan, billing_cycle, price_cop, receipt_code, renews_at)
     values ($1, 'premium', $2, $3, $4, now() + ($5 || ' days')::interval)
     returning id, plan, billing_cycle, price_cop, status, receipt_code, started_at, renews_at`,
    [userId, cycle, price, receipt, cycle === "anual" ? "365" : "30"]
  );
}

export async function cancelSubscription(userId: string) {
  const rows = await query(
    `update subscriptions set status = 'canceled', canceled_at = now() where user_id = $1 and status = 'active' returning id`,
    [userId]
  );
  return rows.length > 0;
}

import { getCurrentUser } from "@/lib/auth";
import { planStatus } from "@/lib/billing";
import PlansView from "@/components/billing/PlansView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Planes — Vesor" };

export default async function PlanesPage() {
  const user = await getCurrentUser();
  const status = user ? await planStatus(user.id) : null;
  return (
    <PlansView
      loggedIn={Boolean(user)}
      plan={status?.plan ?? null}
      used={status?.used ?? 0}
      limit={status?.limit ?? null}
      subscription={
        status?.subscription
          ? {
              billing_cycle: status.subscription.billing_cycle,
              price_cop: status.subscription.price_cop,
              receipt_code: status.subscription.receipt_code,
              renews_at: new Date(status.subscription.renews_at).toISOString(),
            }
          : null
      }
    />
  );
}

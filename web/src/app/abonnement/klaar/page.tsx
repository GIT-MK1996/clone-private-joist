import { redirect } from "next/navigation";
import { getCompany } from "@/lib/data";
import { finishCheckout, syncNow } from "@/lib/billing";

export const dynamic = "force-dynamic";

/** Return point from Stripe Checkout and the customer portal: sync, then continue. */
export default async function Done({ searchParams }: { searchParams: Promise<{ session_id?: string; portal?: string }> }) {
  const company = await getCompany({ unpaid: true });
  const { session_id, portal } = await searchParams;
  try {
    if (session_id) await finishCheckout(company, session_id);
    else if (portal) await syncNow(company);
  } catch (e) {
    console.error("[billing] sync after return failed", e);
  }
  redirect(portal ? "/app/instellingen#abonnement" : "/app?gestart=1");
}

"use server";

import { redirect } from "next/navigation";
import { getCompany } from "./data";
import { billingConfigured, PLANS, portalUrl, setCancelAtEnd, startCheckout, type Plan } from "./billing";
import { baseUrl } from "./url";

export async function choosePlan(formData: FormData) {
  const c = await getCompany({ unpaid: true });
  const plan = String(formData.get("plan")) as Plan;
  if (!(plan in PLANS) || !billingConfigured()) redirect("/abonnement?fout=1");
  let url: string | null = null;
  try {
    url = await startCheckout(c, plan, await baseUrl());
  } catch (e) {
    console.error("[billing] checkout failed", e);
  }
  redirect(url ?? "/abonnement?fout=1");
}

export async function cancelSubscription() {
  const c = await getCompany({ unpaid: true });
  if (c.subId) await setCancelAtEnd(c, true);
  redirect("/app/instellingen?abo=opgezegd#abonnement");
}

export async function resumeSubscription() {
  const c = await getCompany({ unpaid: true });
  if (c.subId) await setCancelAtEnd(c, false);
  redirect("/app/instellingen?abo=hervat#abonnement");
}

export async function openPortal() {
  const c = await getCompany({ unpaid: true });
  if (!c.subCustomerId) redirect("/abonnement");
  const url = await portalUrl(c, `${await baseUrl()}/abonnement/klaar?portal=1`);
  redirect(url);
}

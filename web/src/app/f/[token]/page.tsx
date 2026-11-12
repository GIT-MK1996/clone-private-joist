import type { Metadata } from "next";
import PublicDocPage from "@/components/PublicDocPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Factuur", robots: { index: false, follow: false } };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ betaling?: string }>;
}) {
  const { token } = await params;
  const { betaling } = await searchParams;
  return <PublicDocPage token={token} kind="invoice" betaling={betaling} />;
}

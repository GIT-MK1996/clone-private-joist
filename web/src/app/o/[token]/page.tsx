import type { Metadata } from "next";
import PublicDocPage from "@/components/PublicDocPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Offerte", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicDocPage token={token} kind="quote" />;
}

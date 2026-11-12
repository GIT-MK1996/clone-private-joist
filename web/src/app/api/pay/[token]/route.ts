import { NextResponse, type NextRequest } from "next/server";
import { startPayment } from "@/lib/payments";
import { baseUrl } from "@/lib/url";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const base = await baseUrl();
  try {
    const checkout = await startPayment(token, base);
    if (checkout) return NextResponse.redirect(checkout, 303);
  } catch (e) {
    console.error("Payment start failed", e);
  }
  return NextResponse.redirect(`${base}/f/${token}?betaling=mislukt`, 303);
}

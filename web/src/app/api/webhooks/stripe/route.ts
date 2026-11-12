import { NextResponse, type NextRequest } from "next/server";
import { syncPayment } from "@/lib/payments";

// Optional: a contractor can point a Stripe webhook (checkout.session.completed) here.
// We do not trust the body: we take the session id and refetch it from Stripe with the contractor's key.
export async function POST(req: NextRequest) {
  const event = await req.json().catch(() => null);
  const id = String(event?.data?.object?.id ?? "");
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return new NextResponse("ignored");
  try {
    await syncPayment(id);
  } catch (e) {
    console.error("Stripe webhook failed", e);
    return new NextResponse("error", { status: 500 });
  }
  return new NextResponse("ok");
}

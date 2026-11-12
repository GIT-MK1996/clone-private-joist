import { NextResponse, type NextRequest } from "next/server";
import { syncPayment } from "@/lib/payments";

// Mollie posts `id=tr_xxx` (form-encoded). We refetch the payment from Mollie and apply it.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const id = String(form?.get("id") ?? "");
  if (!/^tr_[A-Za-z0-9]+$/.test(id)) return new NextResponse("bad request", { status: 400 });
  try {
    await syncPayment(id);
  } catch (e) {
    console.error("Mollie webhook failed", e);
    return new NextResponse("error", { status: 500 }); // Mollie retries
  }
  return new NextResponse("ok");
}

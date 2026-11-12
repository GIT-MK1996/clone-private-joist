import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DocumentView from "@/components/DocumentView";
import PrintButton from "@/components/PrintButton";
import { getDocumentByToken } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PrintPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getDocumentByToken(token);
  if (!data) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 print:p-0">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
      <DocumentView {...data} />
    </main>
  );
}

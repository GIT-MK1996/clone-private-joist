import Link from "next/link";
import { getCompany } from "@/lib/data";

export const dynamic = "force-dynamic";

const nav = [
  { href: "/app", label: "Documenten" },
  { href: "/app/klanten", label: "Klanten" },
  { href: "/app/instellingen", label: "Instellingen" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const company = await getCompany();
  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/app" className="font-bold tracking-tight">
            <span className="text-brand">■</span> Werkbon
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="btn-ghost px-3 py-1.5">{n.label}</Link>
            ))}
          </nav>
          <span className="ml-auto truncate text-sm text-muted">{company.name}</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <nav className="no-print fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-line bg-surface sm:hidden">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="py-3 text-center text-sm font-medium">{n.label}</Link>
        ))}
      </nav>
    </div>
  );
}

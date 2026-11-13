/** Klusnota mark: a piece of folding ruler (duimstok) with a tick. Works from 16px up. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="#E0A100" />
      <path d="M6 6v5M10 6v3M14 6v5M18 6v3M22 6v5M26 6v3" stroke="#17202A" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 19.5l4.5 4.5L24 14" fill="none" stroke="#17202A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <LogoMark size={size} />
      <span>klusnota</span>
    </span>
  );
}

"use client";

import { useState } from "react";

export default function ShareBox({ url, message }: { url: string; message: string }) {
  const [copied, setCopied] = useState(false);
  const wa = `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`;
  return (
    <div className="card flex flex-col gap-3 border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Link voor je klant</p>
        <p className="truncate text-sm text-muted">{url}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Gekopieerd ✓" : "Kopieer link"}
        </button>
        <a href={wa} target="_blank" rel="noreferrer" className="btn-primary bg-[#1f9d55]">
          WhatsApp
        </a>
      </div>
    </div>
  );
}

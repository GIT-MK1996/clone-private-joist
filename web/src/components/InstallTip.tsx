"use client";

import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "klusnota-install-tip";

/** Nudges people to put Klusnota on their home screen. Hidden once installed or dismissed. */
export function InstallTip() {
  const [mode, setMode] = useState<"" | "android" | "ios">("");
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "weg";
    } catch {}
    if (standalone || dismissed) return;
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) setMode("ios");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as PromptEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!mode) return null;

  const close = () => {
    try {
      localStorage.setItem(KEY, "weg");
    } catch {}
    setMode("");
  };

  return (
    <div className="no-print card mb-4 flex items-start gap-3 border-brand bg-brand-soft p-4">
      <img src="/icon-192.png" alt="" width={40} height={40} className="rounded-lg" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">Zet Klusnota op je beginscherm</p>
        {mode === "ios" ? (
          <p className="mt-1 text-muted">
            Tik onderin Safari op <strong>Delen</strong> (vierkantje met pijl) en kies <strong>Zet op beginscherm</strong>. Dan open je
            Klusnota met één tik, net als een app.
          </p>
        ) : (
          <>
            <p className="mt-1 text-muted">Dan open je Klusnota met één tik, net als een app.</p>
            <button
              className="btn-primary mt-2"
              onClick={async () => {
                await prompt?.prompt();
                close();
              }}
            >
              Installeren
            </button>
          </>
        )}
      </div>
      <button onClick={close} className="btn-ghost px-2 py-1 text-sm" aria-label="Sluiten">✕</button>
    </div>
  );
}

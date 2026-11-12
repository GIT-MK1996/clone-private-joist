import "server-only";

type Mail = { to: string; subject: string; html: string; text: string; replyTo?: string };

/**
 * Sends through Resend when RESEND_API_KEY and EMAIL_FROM are set.
 * Without them (local development) the mail is printed to the server log instead.
 */
export async function sendEmail(m: Mail): Promise<{ ok: boolean; dev?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.log(`\n[e-mail niet verstuurd, geen RESEND_API_KEY]\nAan: ${m.to}\nOnderwerp: ${m.subject}\n${m.text}\n`);
    return { ok: true, dev: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo }),
  });
  if (!res.ok) {
    const error = await res.text();
    console.error("Resend error", res.status, error);
    return { ok: false, error };
  }
  return { ok: true };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function simpleHtml(lines: string[], button?: { label: string; url: string }) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;font-size:15px;color:#1c1917;line-height:1.5;max-width:560px;margin:auto;padding:24px">
${lines.map((l) => `<p>${esc(l)}</p>`).join("\n")}
${button ? `<p><a href="${esc(button.url)}" style="display:inline-block;background:#c2410c;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${esc(button.label)}</a></p><p style="font-size:12px;color:#78716c">Werkt de knop niet? Kopieer deze link: ${esc(button.url)}</p>` : ""}
</body></html>`;
}

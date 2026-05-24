// Resend-backed transactional email. One function used for magic-links (login + claim).
// In development without EMAIL_API_KEY, we log the email to the console so dev still works.

import 'server-only';

const RESEND_URL = 'https://api.resend.com/emails';

export async function sendEmail({ to, subject, html, text }: {
  to: string; subject: string; html: string; text: string;
}): Promise<void> {
  const key = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'citynight.gr <noreply@citynight.gr>';

  if (!key) {
    // Dev fallback. Never silently drop in prod — surface the misconfig.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('EMAIL_API_KEY is required in production.');
    }
    console.log('— EMAIL (dev, no API key) ————————————');
    console.log(`To: ${to}\nSubject: ${subject}\n\n${text}\n`);
    console.log('————————————————————————————————————');
    return;
  }

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Email send failed: ${res.status} ${body.slice(0, 200)}`);
  }
}

export function magicLinkEmail({ url, purpose }: { url: string; purpose: 'login' | 'claim' }) {
  const subject = purpose === 'claim' ? 'Claim your venue on citynight.gr' : 'Sign in to citynight.gr';
  const text = `Open this link to ${purpose === 'claim' ? 'claim your venue' : 'sign in'} on citynight.gr:\n\n${url}\n\nThis link expires in 15 minutes. If you didn't request it, you can ignore this email.`;
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#07070b;color:#f4f4f6;padding:40px 20px">
    <div style="max-width:480px;margin:0 auto;background:#0d0d14;padding:32px;border-radius:12px">
      <h1 style="margin:0 0 8px;font-size:20px">${purpose === 'claim' ? 'Claim your venue' : 'Sign in to citynight.gr'}</h1>
      <p style="color:#cfcfd6;margin:0 0 20px">Click the button to continue. This link expires in 15 minutes.</p>
      <p><a href="${url}" style="display:inline-block;background:#ff2d95;color:#07070b;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">Continue →</a></p>
      <p style="color:#6b6b78;font-size:12px;margin-top:24px">If you didn't request this, you can ignore the email.</p>
    </div></body></html>`;
  return { subject, html, text };
}

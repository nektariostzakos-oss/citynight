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
  const html = shell({
    title: purpose === 'claim' ? 'Claim your venue' : 'Sign in to citynight.gr',
    body: `
      <p style="color:#cfcfd6;margin:0 0 20px">Click the button to continue. This link expires in 15 minutes.</p>
      <p>${ctaButton(url, 'Continue →')}</p>
      <p style="color:#6b6b78;font-size:12px;margin-top:24px">If you didn't request this, you can ignore the email.</p>
    `,
  });
  return { subject, html, text };
}

// Sent once, the FIRST time a user verifies a claim. Welcomes them in,
// points to the manage page + dashboard, sets expectations (analytics roll
// up nightly, edits go live within seconds, Featured upsell when ready).
export function welcomeOnFirstClaimEmail({
  venueName, manageUrl, dashboardUrl,
}: { venueName: string; manageUrl: string; dashboardUrl: string }) {
  const subject = `Welcome to citynight.gr — ${venueName} is yours`;
  const text =
    `Welcome to citynight.gr.\n\n` +
    `${venueName} is now linked to your account. You can edit details, post events ` +
    `(Featured tier), and see traffic from the dashboard.\n\n` +
    `Manage venue: ${manageUrl}\nDashboard:    ${dashboardUrl}\n\n` +
    `Edits go live within seconds. Daily analytics roll up around 03:00 Athens time. ` +
    `Reply to this email if you need anything.`;
  const html = shell({
    title: `Welcome — ${escapeHtml(venueName)} is yours`,
    body: `
      <p style="color:#cfcfd6;margin:0 0 16px">
        Thanks for claiming <strong style="color:#f4f4f6">${escapeHtml(venueName)}</strong>.
        It's now linked to your account. A few things you can do right away:
      </p>
      <ul style="color:#cfcfd6;margin:0 0 20px;padding-left:18px;line-height:1.6">
        <li>Edit facts (phone, hours, address, website, description).</li>
        <li>See views &amp; directions taps per day.</li>
        <li>Post events to show up at the top of your category (Featured tier).</li>
      </ul>
      <p style="margin:0 0 12px">${ctaButton(manageUrl, 'Manage your venue →')}</p>
      <p style="margin:0 0 20px;font-size:13px"><a href="${dashboardUrl}" style="color:#00e5ff;text-decoration:none">or open the full dashboard →</a></p>
      <p style="color:#6b6b78;font-size:12px;margin-top:24px;border-top:1px solid #1c1c29;padding-top:16px">
        Heads-up: AI never writes your facts. Hours, phone, address come from Google Places or you.
        Edits override Google. The page URL is yours for as long as the business operates.
      </p>
    `,
  });
  return { subject, html, text };
}

// Sent once when a venue's status flips draft/pending → published (e.g.
// after Places verification on a new submission or after a confidence
// re-evaluation by the gate cron).
export function venuePublishedEmail({
  venueName, publicUrl,
}: { venueName: string; publicUrl: string }) {
  const subject = `${venueName} is live on citynight.gr`;
  const text = `${venueName} is now publicly listed: ${publicUrl}\n\n` +
    `Share the link with customers — it carries proper Open Graph + structured ` +
    `data so previews render with your hero photo and name.`;
  const html = shell({
    title: `${escapeHtml(venueName)} is live`,
    body: `
      <p style="color:#cfcfd6;margin:0 0 16px">
        Your venue passed validation and is publicly listed on citynight.gr.
      </p>
      <p>${ctaButton(publicUrl, 'See the live page →')}</p>
    `,
  });
  return { subject, html, text };
}

// ── Shared shell + helpers ─────────────────────────────────────────────
function shell({ title, body }: { title: string; body: string }) {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#07070b;color:#f4f4f6;padding:40px 20px;margin:0">
    <div style="max-width:520px;margin:0 auto;background:#0d0d14;padding:32px;border-radius:12px;border:1px solid #1c1c29">
      <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#9a9aa6">
        <span style="color:#f4f4f6">city</span><span style="color:#ff2d95">night</span>
      </p>
      <h1 style="margin:0 0 16px;font-size:20px;color:#f4f4f6">${title}</h1>
      ${body}
    </div></body></html>`;
}
function ctaButton(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#ff2d95;color:#07070b;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">${label}</a>`;
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

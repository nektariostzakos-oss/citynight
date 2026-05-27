// POST /api/sites — Create a free SaaS site for the authenticated owner.
//
// Phase H4 model:
//   • Base hosted site is FREE forever (no Stripe step at signup).
//   • €19/mo unlocks custom domain — owner triggers this from the dashboard
//     domain editor when they want to point their own .gr at the site.
//   • €190 one-time unlocks the Atelier ZIP download — same Checkout
//     pattern, gated separately in the dashboard.
//
// On success the site is published immediately and the owner lands on
// their dashboard. The Stripe wiring (subscription / zip) is now in
// /api/sites/[id]/checkout — invoked from the dashboard, not signup.

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { rateLimit429, ipKey } from '@/lib/rate-limit';
import { createSite, type Vertical } from '@/lib/sites';
import { db } from '@/db';

const VALID_VERTICALS: ReadonlyArray<Vertical> = [
  'restaurant', 'bar', 'rooftop', 'nightclub', 'beach_club', 'hotel', 'cafe', 'salon', 'other',
];

export async function POST(req: NextRequest) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  // 6 signups/hour/IP is generous for the lone owner working through the
  // form; cuts off scripted abuse.
  const limited = rateLimit429(`site-signup:${ipKey(req)}`, { max: 6, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const user = await requireUser();

  let body: { name?: unknown; vertical?: unknown; city?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 120) return NextResponse.json({ ok: false, error: 'invalid_name' }, { status: 400 });

  const vertical = typeof body.vertical === 'string' && (VALID_VERTICALS as readonly string[]).includes(body.vertical)
    ? (body.vertical as Vertical) : null;
  if (!vertical) return NextResponse.json({ ok: false, error: 'invalid_vertical' }, { status: 400 });

  const city = typeof body.city === 'string' ? body.city.trim().slice(0, 80) : null;

  const { id: siteId, slug } = createSite({
    ownerId: user.id,
    name,
    vertical,
    city: city || null,
    contactEmail: user.email,
  });

  // Site is free + published immediately. Resolve city_slug from the
  // citynight cities table so the new URL works out of the box.
  if (city) {
    db.$client.prepare(`
      UPDATE sites
         SET status = 'published',
             saas_status = 'active',
             published_at = unixepoch(),
             city_slug = (SELECT slug FROM cities WHERE LOWER(name) = LOWER(?) LIMIT 1)
       WHERE id = ?
    `).run(city, siteId);
  } else {
    db.$client.prepare(`
      UPDATE sites SET status='published', saas_status='active', published_at=unixepoch() WHERE id = ?
    `).run(siteId);
  }

  return NextResponse.json({ ok: true, siteId, slug });
}

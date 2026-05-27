// POST /api/sites/[id]/claim — transfer ownership of a previously-unclaimed
// site (currently held by the citynight system user) to the authenticated
// user. After successful claim the user becomes the owner, can edit
// everything via /[locale]/dashboard/sites/[id], and the public site's
// "Claim this business" CTA disappears.
//
// v1 trust model: any authenticated user can claim ANY unclaimed site.
// Real-world we'd verify against the site's contact_email or reservation_email,
// or require email magic-link confirmation from a domain that matches. The
// migration path here mirrors the existing venue claim — owner_id flips
// instantly; admin can reverse if abuse shows up.

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { rateLimit429, ipKey } from '@/lib/rate-limit';
import { db } from '@/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const limited = rateLimit429(`site-claim:${ipKey(req)}`, { max: 12, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const user = await requireUser();
  const { id } = await params;

  const sqlite = db.$client;
  const sysUser = sqlite.prepare(`SELECT id FROM users WHERE email = 'system@citynight.gr'`).get() as { id: string } | undefined;
  if (!sysUser) return NextResponse.json({ ok: false, error: 'system_user_missing' }, { status: 500 });

  const site = sqlite.prepare(`
    SELECT id, slug, city_slug AS citySlug, owner_id AS ownerId
      FROM sites WHERE id = ?
  `).get(id) as { id: string; slug: string; citySlug: string | null; ownerId: string } | undefined;
  if (!site) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  // Already claimed by this user → no-op success (idempotent).
  if (site.ownerId === user.id) {
    return NextResponse.json({ ok: true, alreadyOwned: true, siteId: id });
  }
  // Already claimed by someone else → 409. They'd need to contact us.
  if (site.ownerId !== sysUser.id) {
    return NextResponse.json({ ok: false, error: 'already_claimed' }, { status: 409 });
  }

  sqlite.prepare(`UPDATE sites SET owner_id = ? WHERE id = ?`).run(user.id, id);

  // Refresh the public site so the "Claim this business" CTA disappears.
  if (site.citySlug && site.slug) {
    for (const l of ['en', 'el', 'de', 'fr', 'it']) {
      revalidatePath(`/${l}/cities/${site.citySlug}/${site.slug}`);
    }
  }

  return NextResponse.json({ ok: true, siteId: id });
}

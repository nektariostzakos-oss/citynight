import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { setOwnerDesignParams, clearOwnerDesignOverride } from '@/lib/owner-design';
import { db } from '@/db';

// PATCH /api/venues/[id]/design — Featured owner saves a design override.
// DELETE — Featured owner clears the override; the venue goes back to the
// deterministic default until the next AI design batch.
//
// Both flow through lib/owner-design.ts which enforces ownership + Featured
// tier + DesignParams shape validation before touching the DB.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  try {
    const canonical = setOwnerDesignParams(id, user.id, body);
    revalidateVenue(id);
    return NextResponse.json({ ok: true, design: canonical });
  } catch (err) {
    return responseOrRethrow(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // No body to read; CSRF same-origin still applies to mutating verbs.
  const csrf = requireSameOrigin(_req); if (csrf) return csrf;
  const user = await requireUser();
  const { id } = await params;
  try {
    clearOwnerDesignOverride(id, user.id);
    revalidateVenue(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return responseOrRethrow(err);
  }
}

// Re-render the public venue page across all locales as soon as the design
// changes — the owner expects to see their pick live within seconds.
function revalidateVenue(id: string) {
  const row = db.$client.prepare(`
    SELECT v.slug, c.slug AS city, COALESCE(a.slug, cat.slug) AS bucket
      FROM venues v
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
     WHERE v.id = ?
  `).get(id) as { slug: string | null; city: string; bucket: string | null } | undefined;
  if (row?.slug && row.bucket) {
    for (const l of ['en', 'el', 'de', 'fr', 'it']) {
      revalidatePath(`/${l}/greece/${row.city}/${row.bucket}/${row.slug}`);
    }
  }
}

// owner-design.ts throws bare Response instances on auth / validation
// failures. Surface those; otherwise rethrow so the framework returns 500.
function responseOrRethrow(err: unknown): Response {
  if (err instanceof Response) return err;
  throw err;
}

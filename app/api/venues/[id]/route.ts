import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { ownerUpdateVenue } from '@/lib/owner-edit';
import { db } from '@/db';

// PATCH /api/venues/[id] — owner edits a small set of fact + content fields.
// Each successful PATCH revalidates the venue's ISR page so the change shows up
// on the public site within seconds (no waiting for the next on-schedule revalidate).

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  ownerUpdateVenue(id, user.id, body);

  // Find the public URL(s) to revalidate. ISR cache is keyed by the path.
  const row = db.$client.prepare(`
    SELECT v.slug, c.slug AS city, COALESCE(a.slug, cat.slug) AS bucket
      FROM venues v
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
     WHERE v.id = ?
  `).get(id) as { slug: string | null; city: string; bucket: string | null } | undefined;

  if (row?.slug && row.bucket) {
    // All locale variants share the same ISR cache entry per locale path.
    for (const l of ['en', 'el', 'de', 'fr', 'it']) {
      revalidatePath(`/${l}/greece/${row.city}/${row.bucket}/${row.slug}`);
    }
  }

  return NextResponse.json({ ok: true });
}

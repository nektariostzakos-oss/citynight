import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { reorderOwnerPhotos } from '@/lib/owner-photos';
import { db } from '@/db';

// POST /api/venues/[id]/photos/reorder
// Body: { ids: string[], primaryId: string | null }
// Reorders owner_upload photos by id index + (optionally) sets the primary
// gallery photo.

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  const { id } = await params;
  let body: { ids?: unknown; primaryId?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === 'string') : null;
  if (!ids) return NextResponse.json({ ok: false, error: 'ids_required' }, { status: 400 });
  const primaryId = typeof body.primaryId === 'string' ? body.primaryId : null;

  try {
    reorderOwnerPhotos(id, user.id, ids, primaryId);
    revalidateVenue(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

function revalidateVenue(id: string) {
  const row = db.$client.prepare(`
    SELECT v.slug, c.slug AS city, COALESCE(a.slug, cat.slug) AS bucket
      FROM venues v
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
     WHERE v.id = ?
  `).get(id) as { slug: string | null; city: string; bucket: string | null } | undefined;
  if (!row?.slug || !row.bucket) return;
  for (const l of ['en', 'el', 'de', 'fr', 'it']) {
    for (const sub of ['', '/gallery']) {
      revalidatePath(`/${l}/greece/${row.city}/${row.bucket}/${row.slug}${sub}`);
    }
  }
}

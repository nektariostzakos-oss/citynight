import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { deleteOwnerPhoto } from '@/lib/owner-photos';
import { db } from '@/db';

// DELETE /api/venues/[id]/photos/[photoId] — removes one owner_upload photo
// (DB row + file on disk). Places photos cannot be deleted via this route;
// lib/owner-photos.ts rejects them with 400.

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  const { id, photoId } = await params;
  try {
    await deleteOwnerPhoto(id, user.id, photoId);
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

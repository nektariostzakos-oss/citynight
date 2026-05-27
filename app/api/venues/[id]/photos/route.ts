import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { saveVenuePhoto, MAX_BYTES } from '@/lib/uploads';
import { attachOwnerPhoto, listOwnerPhotos } from '@/lib/owner-photos';
import { db } from '@/db';

// POST /api/venues/[id]/photos — multipart upload of one owner photo per
// request. Returns { id, url } on success. Free tier OK (more SEO content).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  const { id } = await params;

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'missing_file' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ ok: false, error: 'empty_file' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'too_large' }, { status: 413 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const saved = await saveVenuePhoto(id, { mime: file.type, bytes, size: file.size });
    const row = attachOwnerPhoto(id, user.id, saved);
    revalidateVenue(id);
    return NextResponse.json({ ok: true, id: row.id, url: saved.url });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

// GET — list owner photos (used by the dashboard uploader after upload).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  return NextResponse.json({ photos: listOwnerPhotos(id) });
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

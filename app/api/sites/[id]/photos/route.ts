import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { saveVenuePhoto, MAX_BYTES } from '@/lib/uploads';
import { attachSitePhoto, listSitePhotos } from '@/lib/owner-site-photos';
import { revalidateSitePaths } from '@/lib/site-revalidate';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  const { id } = await params;
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'missing_file' }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ ok: false, error: 'empty_file' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: 'too_large' }, { status: 413 });
  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    // saveVenuePhoto's path layout uses /venues/{id}/; reusing it for sites is
    // fine — the directory structure inside UPLOADS_PATH is just a folder.
    // Keeping the venue helper name avoids forking a duplicate.
    const saved = await saveVenuePhoto(id, { mime: file.type, bytes, size: file.size });
    const row = attachSitePhoto(id, user.id, saved);
    revalidateSitePaths(id, ['', '/gallery'], revalidatePath);
    return NextResponse.json({ ok: true, id: row.id, url: saved.url });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  return NextResponse.json({ photos: listSitePhotos(id) });
}

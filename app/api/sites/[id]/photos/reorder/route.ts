import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { reorderSitePhotos } from '@/lib/owner-site-photos';
import { revalidateSitePaths } from '@/lib/site-revalidate';

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
    reorderSitePhotos(id, user.id, ids, primaryId);
    revalidateSitePaths(id, ['', '/gallery'], revalidatePath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { deleteSitePhoto } from '@/lib/owner-site-photos';
import { revalidateSitePaths } from '@/lib/site-revalidate';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  const { id, photoId } = await params;
  try {
    await deleteSitePhoto(id, user.id, photoId);
    revalidateSitePaths(id, ['', '/gallery'], revalidatePath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

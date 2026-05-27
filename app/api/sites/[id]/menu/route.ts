import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { replaceSiteMenu, type SiteMenuInput } from '@/lib/owner-site';
import { revalidateSitePaths } from '@/lib/site-revalidate';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  const { id } = await params;
  let body: SiteMenuInput;
  try { body = (await req.json()) as SiteMenuInput; } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    replaceSiteMenu(id, user.id, body);
    revalidateSitePaths(id, ['', '/menu'], revalidatePath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { setSiteInfo, type SiteInfoInput } from '@/lib/owner-site';
import { revalidateSitePaths } from '@/lib/site-revalidate';

// PATCH /api/sites/[id]/info — business info (name, city, address, phone,
// contactEmail, tagline, wordmark). Each saved field is a partial update.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  const { id } = await params;
  let body: SiteInfoInput;
  try { body = (await req.json()) as SiteInfoInput; } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    setSiteInfo(id, user.id, body);
    revalidateSitePaths(id, ['', '/menu', '/about', '/book', '/gallery', '/contact'], revalidatePath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

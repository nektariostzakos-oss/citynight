import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { setSiteReservation, type SiteReservationInput } from '@/lib/owner-site';
import { revalidateSitePaths } from '@/lib/site-revalidate';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  const { id } = await params;
  let body: SiteReservationInput;
  try { body = (await req.json()) as SiteReservationInput; } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    setSiteReservation(id, user.id, body);
    revalidateSitePaths(id, ['', '/book'], revalidatePath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

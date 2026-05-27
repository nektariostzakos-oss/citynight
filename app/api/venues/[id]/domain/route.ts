import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { setOwnerCustomDomain } from '@/lib/owner-domain';

// PATCH /api/venues/[id]/domain — set or clear custom_domain.
// Body: { domain: string | null }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  const { id } = await params;
  let body: { domain?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const raw = body.domain;
  const input = typeof raw === 'string' ? raw : raw === null ? null : undefined;
  if (input === undefined) return NextResponse.json({ ok: false, error: 'domain_required' }, { status: 400 });

  try {
    const saved = setOwnerCustomDomain(id, user.id, input);
    return NextResponse.json({ ok: true, domain: saved });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

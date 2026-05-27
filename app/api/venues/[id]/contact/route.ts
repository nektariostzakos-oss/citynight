import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/csrf';
import { rateLimit429, ipKey } from '@/lib/rate-limit';
import { submitContactMessage, type ContactInput } from '@/lib/visitor-contact';

// POST /api/venues/[id]/contact — visitor-submitted contact / reservation.
// No auth (this is the public surface). CSRF same-origin gate + per-IP
// rate-limit prevents bot floods.

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;

  // 8 messages per 15 min per IP is plenty for a real visitor making typos;
  // pinches off any obvious spam loop without paging the owner.
  const limited = rateLimit429(`venue-contact:${ipKey(req)}`, { max: 8, windowMs: 15 * 60_000 });
  if (limited) return limited;

  const { id } = await params;
  let body: ContactInput;
  try { body = (await req.json()) as ContactInput; } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    const result = await submitContactMessage(id, body);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

// PATCH /api/sites/[id]/reviews/[reviewId]  — owner moderation.
//   { action: 'approve' | 'reject' }  → flips status
//   { reply: string | null }          → sets/clears the public reply

import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/csrf';
import { requireSiteOwner } from '@/lib/auth/site-owner';
import { approveReview, rejectReview, setReviewReply } from '@/lib/crm';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; reviewId: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const { id, reviewId } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }

  let body: { action?: unknown; reply?: unknown };
  try { body = (await req.json()) as { action?: unknown; reply?: unknown }; }
  catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  if (body.action === 'approve') {
    const r = approveReview(id, reviewId);
    if (!r) return NextResponse.json({ error: 'not_actionable' }, { status: 409 });
    return NextResponse.json({ ok: true, review: r });
  }
  if (body.action === 'reject') {
    const r = rejectReview(id, reviewId);
    if (!r) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true, review: r });
  }
  if (body.reply !== undefined) {
    try {
      const r = setReviewReply(id, reviewId, body.reply === null ? null : String(body.reply));
      if (!r) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      return NextResponse.json({ ok: true, review: r });
    } catch (err) {
      if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }
  }
  return NextResponse.json({ error: 'no_action' }, { status: 400 });
}

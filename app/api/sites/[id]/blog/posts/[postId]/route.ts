// PATCH  /api/sites/[id]/blog/posts/[postId]   — owner update
// DELETE /api/sites/[id]/blog/posts/[postId]   — owner delete

import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/csrf';
import { requireSiteOwner } from '@/lib/auth/site-owner';
import { updatePost, deletePost, type PostInput } from '@/lib/blog/posts';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; postId: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const { id, postId } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const patch: Partial<PostInput> = {};
  if (typeof body.slug === 'string')      patch.slug = body.slug.trim().toLowerCase();
  if (typeof body.title === 'string')     patch.title = body.title.trim();
  if (body.excerpt !== undefined)         patch.excerpt = body.excerpt === null ? null : String(body.excerpt).trim() || null;
  if (body.body !== undefined)            patch.body = body.body === null ? null : String(body.body);
  if (body.coverUrl !== undefined)        patch.coverUrl = body.coverUrl === null ? null : String(body.coverUrl).trim() || null;
  if (body.category !== undefined)        patch.category = body.category === null ? null : String(body.category).trim() || null;
  if (typeof body.published === 'boolean') patch.published = body.published;

  try {
    const post = updatePost(id, postId, patch);
    if (!post) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true, post });
  } catch (err) {
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; postId: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const { id, postId } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }
  const removed = deletePost(id, postId);
  if (!removed) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

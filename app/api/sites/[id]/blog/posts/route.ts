// GET  /api/sites/[id]/blog/posts        — public list (published only),
//                                           or owner list (incl. drafts)
//                                           when the caller owns the site.
// POST /api/sites/[id]/blog/posts        — owner create

import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/csrf';
import { requireSiteOwner } from '@/lib/auth/site-owner';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/db';
import { listPosts, listPublishedPosts, createPost, type PostInput } from '@/lib/blog/posts';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const isOwner = user && db.$client.prepare(
    `SELECT 1 FROM sites WHERE id = ? AND owner_id = ?`,
  ).get(id, user.id);
  const posts = isOwner ? listPosts(id) : listPublishedPosts(id);
  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const { id } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!slug || !title) return NextResponse.json({ error: 'missing_required' }, { status: 400 });

  const input: PostInput = {
    slug, title,
    excerpt: typeof body.excerpt === 'string' ? body.excerpt.trim() || null : null,
    body: typeof body.body === 'string' ? body.body : null,
    coverUrl: typeof body.coverUrl === 'string' ? body.coverUrl.trim() || null : null,
    category: typeof body.category === 'string' ? body.category.trim() || null : null,
    published: typeof body.published === 'boolean' ? body.published : false,
  };

  try {
    const post = createPost(id, input);
    return NextResponse.json({ ok: true, post });
  } catch (err) {
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}

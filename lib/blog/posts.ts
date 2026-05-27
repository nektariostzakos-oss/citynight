// Per-site blog posts. Backed by site_pages (kind='post'). The same
// table holds standalone pages (kind='page'); this module is the
// blog-specific facade so posts and pages can evolve independently.
//
// Public reads filter on (kind='post', published=1). Owner reads
// include drafts.

import 'server-only';
import { db } from '@/db';

export type SiteBlogPost = {
  id: string;
  siteId: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  coverUrl: string | null;
  category: string | null;
  categoryId: string | null;
  published: boolean;
  publishedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

const dbh = () => db.$client;

const SELECT = `
  SELECT id, site_id, slug, title, excerpt, body, cover_url,
         category, category_id, published, published_at,
         created_at, updated_at
    FROM site_pages
`;

function row(r: Record<string, unknown>): SiteBlogPost {
  return {
    id: String(r.id),
    siteId: String(r.site_id),
    slug: String(r.slug),
    title: String(r.title),
    excerpt: (r.excerpt as string | null) ?? null,
    body: (r.body as string | null) ?? null,
    coverUrl: (r.cover_url as string | null) ?? null,
    category: (r.category as string | null) ?? null,
    categoryId: (r.category_id as string | null) ?? null,
    published: Number(r.published) === 1,
    publishedAt: r.published_at !== null ? Number(r.published_at) : null,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

export function listPosts(siteId: string, opts: { limit?: number } = {}): SiteBlogPost[] {
  const limit = Math.min(500, Math.max(1, Math.floor(opts.limit ?? 200)));
  return (dbh().prepare(`${SELECT}
     WHERE site_id = ? AND kind = 'post'
     ORDER BY COALESCE(published_at, created_at) DESC
     LIMIT ?
  `).all(siteId, limit) as Record<string, unknown>[]).map(row);
}

export function listPublishedPosts(siteId: string, opts: { limit?: number } = {}): SiteBlogPost[] {
  const limit = Math.min(500, Math.max(1, Math.floor(opts.limit ?? 50)));
  return (dbh().prepare(`${SELECT}
     WHERE site_id = ? AND kind = 'post' AND published = 1
     ORDER BY COALESCE(published_at, created_at) DESC
     LIMIT ?
  `).all(siteId, limit) as Record<string, unknown>[]).map(row);
}

export function getPostBySlug(siteId: string, slug: string, opts: { includeDrafts?: boolean } = {}): SiteBlogPost | null {
  const guard = opts.includeDrafts ? '' : ' AND published = 1';
  const r = dbh().prepare(`${SELECT}
     WHERE site_id = ? AND kind = 'post' AND slug = ?${guard}
     LIMIT 1
  `).get(siteId, slug) as Record<string, unknown> | undefined;
  return r ? row(r) : null;
}

export function getPost(siteId: string, postId: string): SiteBlogPost | null {
  const r = dbh().prepare(`${SELECT} WHERE site_id = ? AND id = ? AND kind = 'post' LIMIT 1`)
    .get(siteId, postId) as Record<string, unknown> | undefined;
  return r ? row(r) : null;
}

// ─── owner CRUD ───────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,80}[a-z0-9])?$/;

export type PostInput = {
  slug: string;
  title: string;
  excerpt?: string | null;
  body?: string | null;
  coverUrl?: string | null;
  category?: string | null;
  published?: boolean;
};

export function createPost(siteId: string, input: PostInput): SiteBlogPost {
  if (!SLUG_RE.test(input.slug)) throw new Error('bad_slug');
  if (!input.title || input.title.length > 200) throw new Error('bad_title');
  const id = crypto.randomUUID();
  const publishedAt = input.published ? Math.floor(Date.now() / 1000) : null;
  try {
    dbh().prepare(`
      INSERT INTO site_pages (
        id, site_id, slug, kind, title, excerpt, body, cover_url,
        category, published, published_at
      ) VALUES (?, ?, ?, 'post', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, siteId, input.slug, input.title,
      input.excerpt ?? null, input.body ?? null, input.coverUrl ?? null,
      input.category ?? null, input.published ? 1 : 0, publishedAt,
    );
  } catch (err) {
    if (err instanceof Error && /UNIQUE/.test(err.message)) throw new Error('slug_taken');
    throw err;
  }
  return getPost(siteId, id)!;
}

export function updatePost(siteId: string, postId: string, patch: Partial<PostInput>): SiteBlogPost | null {
  const existing = getPost(siteId, postId);
  if (!existing) return null;

  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.slug !== undefined) {
    if (!SLUG_RE.test(patch.slug)) throw new Error('bad_slug');
    sets.push('slug = ?'); args.push(patch.slug);
  }
  if (patch.title !== undefined) {
    if (!patch.title || patch.title.length > 200) throw new Error('bad_title');
    sets.push('title = ?'); args.push(patch.title);
  }
  if (patch.excerpt !== undefined) { sets.push('excerpt = ?');   args.push(patch.excerpt); }
  if (patch.body !== undefined)    { sets.push('body = ?');      args.push(patch.body); }
  if (patch.coverUrl !== undefined){ sets.push('cover_url = ?'); args.push(patch.coverUrl); }
  if (patch.category !== undefined){ sets.push('category = ?');  args.push(patch.category); }
  if (patch.published !== undefined) {
    sets.push('published = ?'); args.push(patch.published ? 1 : 0);
    // Stamp published_at the first time we publish; don't touch it on re-publish.
    if (patch.published && !existing.publishedAt) {
      sets.push('published_at = unixepoch()');
    }
  }
  if (sets.length === 0) return existing;
  sets.push('updated_at = unixepoch()');
  args.push(siteId, postId);

  try {
    dbh().prepare(`
      UPDATE site_pages SET ${sets.join(', ')}
       WHERE site_id = ? AND id = ? AND kind = 'post'
    `).run(...args);
  } catch (err) {
    if (err instanceof Error && /UNIQUE/.test(err.message)) throw new Error('slug_taken');
    throw err;
  }
  return getPost(siteId, postId);
}

export function deletePost(siteId: string, postId: string): boolean {
  const info = dbh().prepare(
    `DELETE FROM site_pages WHERE site_id = ? AND id = ? AND kind = 'post'`,
  ).run(siteId, postId);
  return info.changes > 0;
}

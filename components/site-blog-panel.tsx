'use client';

// Phase I.8 — owner dashboard blog panel. List + add + inline edit
// modal (same pattern as SiteProductsPanel).

import { useEffect, useState, useTransition } from 'react';

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  coverUrl: string | null;
  category: string | null;
  published: boolean;
  publishedAt: number | null;
};

type Labels = {
  heading: string;
  body: string;
  empty: string;
  loadError: string;
  addCta: string;
  columnTitle: string;
  columnCategory: string;
  columnStatus: string;
  columnActions: string;
  edit: string;
  remove: string;
  draft: string;
  published: string;
  saving: string;
  save: string;
  publish: string;
  unpublish: string;
};

const ERR: Record<string, string> = {
  bad_slug: 'Slug must be lowercase letters, numbers, and hyphens.',
  slug_taken: 'A post already uses this slug.',
  bad_title: 'Title is required.',
};

export function SiteBlogPanel({ siteId, labels }: { siteId: string; labels: Labels }) {
  const [rows, setRows] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Post | 'new' | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    fetch(`/api/sites/${siteId}/blog/posts`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { posts: Post[] }) => { setRows(d.posts); setError(null); })
      .catch(() => setError('load'));
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [siteId]);

  function remove(postId: string) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    startTransition(async () => {
      const res = await fetch(`/api/sites/${siteId}/blog/posts/${postId}`, {
        method: 'DELETE', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (!res.ok) { setError('delete'); return; }
      load();
    });
  }

  function togglePublish(p: Post) {
    startTransition(async () => {
      const res = await fetch(`/api/sites/${siteId}/blog/posts/${p.id}`, {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !p.published }),
      });
      if (!res.ok) { setError('publish'); return; }
      load();
    });
  }

  function save(patch: Record<string, unknown>) {
    const id = editing === 'new' ? null : editing?.id;
    startTransition(async () => {
      const res = await fetch(id ? `/api/sites/${siteId}/blog/posts/${id}` : `/api/sites/${siteId}/blog/posts`, {
        method: id ? 'PATCH' : 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? 'save'); return; }
      setEditing(null);
      load();
    });
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">{labels.heading}</h2>
        <button
          type="button"
          onClick={() => { setError(null); setEditing('new'); }}
          className="rounded-md border border-[var(--color-bg-3)] px-3 py-1.5 text-xs font-semibold text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
        >
          + {labels.addCta}
        </button>
      </div>
      <p className="mt-1 text-sm text-[var(--color-fg-2)]">{labels.body}</p>

      <div className="mt-5">
        {rows === null && !error && <p className="text-sm text-[var(--color-fg-2)]">…</p>}
        {error && <p className="text-sm text-red-400">{ERR[error] ?? labels.loadError}</p>}
        {rows && rows.length === 0 && <p className="text-sm text-[var(--color-fg-2)]">{labels.empty}</p>}
        {rows && rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-bg-2)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-bg-1)] text-[var(--color-fg-2)]">
                <tr>
                  <th className="px-4 py-3 font-medium">{labels.columnTitle}</th>
                  <th className="px-4 py-3 font-medium">{labels.columnCategory}</th>
                  <th className="px-4 py-3 font-medium">{labels.columnStatus}</th>
                  <th className="px-4 py-3 font-medium text-right">{labels.columnActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-bg-2)]">
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-[var(--color-fg-0)]">
                      <div>{p.title}</div>
                      <div className="text-xs text-[var(--color-fg-2)]">/{p.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-fg-1)]">{p.category ?? '—'}</td>
                    <td className="px-4 py-3">
                      {p.published ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">{labels.published}</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-fg-3)]">{labels.draft}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" disabled={pending} onClick={() => togglePublish(p)} className="rounded border border-[var(--color-bg-3)] px-2 py-1 text-xs text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]">
                          {p.published ? labels.unpublish : labels.publish}
                        </button>
                        <button type="button" disabled={pending} onClick={() => { setError(null); setEditing(p); }} className="rounded border border-[var(--color-bg-3)] px-2 py-1 text-xs text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]">{labels.edit}</button>
                        <button type="button" disabled={pending} onClick={() => remove(p.id)} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">{labels.remove}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <EditModal post={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={save} saving={pending} labels={labels} />}
    </section>
  );
}

function EditModal({ post, onClose, onSave, saving, labels }: {
  post: Post | null;
  onClose: () => void;
  onSave: (p: Record<string, unknown>) => void;
  saving: boolean;
  labels: Labels;
}) {
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [title, setTitle] = useState(post?.title ?? '');
  const [category, setCategory] = useState(post?.category ?? '');
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const [coverUrl, setCoverUrl] = useState(post?.coverUrl ?? '');
  const [published, setPublished] = useState(post?.published ?? false);

  function submit() {
    onSave({
      slug: slug.trim().toLowerCase(),
      title: title.trim(),
      category: category.trim() || null,
      excerpt: excerpt.trim() || null,
      body: body || null,
      coverUrl: coverUrl.trim() || null,
      published,
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-[var(--color-bg-3)] bg-[var(--color-bg-0)] p-6 shadow-2xl">
        <h3 className="mb-4 font-display text-lg font-semibold text-[var(--color-fg-0)]">
          {post ? `Edit · ${post.title}` : 'New post'}
        </h3>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-4">
          <Row label="Title *">
            <input required type="text" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-2 text-sm text-[var(--color-fg-0)]" />
          </Row>
          <Row label="Slug *">
            <input required type="text" maxLength={80} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="hello-world" className="w-full rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-2 text-sm text-[var(--color-fg-0)]" />
          </Row>
          <Row label="Category (free text)">
            <input type="text" maxLength={80} value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-2 text-sm text-[var(--color-fg-0)]" />
          </Row>
          <Row label="Excerpt">
            <input type="text" maxLength={300} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="w-full rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-2 text-sm text-[var(--color-fg-0)]" />
          </Row>
          <Row label="Cover image URL">
            <input type="text" maxLength={500} value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" className="w-full rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-2 text-sm text-[var(--color-fg-0)]" />
          </Row>
          <Row label="Body">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className="w-full rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-2 font-mono text-sm text-[var(--color-fg-0)]" />
          </Row>
          <label className="flex items-center gap-2 text-sm text-[var(--color-fg-1)]">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> {labels.published}
          </label>
          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded border border-[var(--color-bg-3)] px-4 py-2 text-sm text-[var(--color-fg-1)]">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-[var(--color-accent-cyan)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] disabled:opacity-60">
              {saving ? labels.saving : labels.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-[var(--color-fg-2)] mb-1">{label}</span>
      {children}
    </label>
  );
}

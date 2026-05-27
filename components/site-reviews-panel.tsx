'use client';

// Phase I.7 — owner dashboard review moderation queue.

import { useEffect, useState, useTransition } from 'react';
import { formatAthensDate } from '@/lib/format-date';

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  createdAt: number;
  reply: string | null;
};

type Labels = {
  heading: string;
  body: string;
  empty: string;
  loadError: string;
  filterAll: string;
  filterPending: string;
  filterApproved: string;
  filterRejected: string;
  approve: string;
  reject: string;
  reply: string;
};

const FILTERS: Array<'all' | 'pending' | 'approved' | 'rejected'> = ['all', 'pending', 'approved', 'rejected'];

export function SiteReviewsPanel({ siteId, labels }: { siteId: string; labels: Labels }) {
  const [rows, setRows] = useState<Review[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    fetch(`/api/sites/${siteId}/reviews?status=${filter}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { reviews: Review[] }) => { setRows(d.reviews); setError(null); })
      .catch(() => setError('load'));
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter, siteId]);

  function action(reviewId: string, action: 'approve' | 'reject') {
    startTransition(async () => {
      const res = await fetch(`/api/sites/${siteId}/reviews/${reviewId}`, {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) { setError('patch'); return; }
      load();
    });
  }

  function reply(reviewId: string, text: string) {
    startTransition(async () => {
      const res = await fetch(`/api/sites/${siteId}/reviews/${reviewId}`, {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: text || null }),
      });
      if (!res.ok) { setError('patch'); return; }
      load();
    });
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">{labels.heading}</h2>
        <div className="flex gap-1 text-xs">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 ${
                filter === f
                  ? 'border-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)]'
                  : 'border-[var(--color-bg-3)] text-[var(--color-fg-2)] hover:border-[var(--color-accent-cyan)]'
              }`}
            >
              {labels[`filter${f.charAt(0).toUpperCase()}${f.slice(1)}` as keyof Labels] as string}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-[var(--color-fg-2)]">{labels.body}</p>

      <div className="mt-5 space-y-4">
        {rows === null && !error && <p className="text-sm text-[var(--color-fg-2)]">…</p>}
        {error && <p className="text-sm text-red-400">{labels.loadError}</p>}
        {rows && rows.length === 0 && <p className="text-sm text-[var(--color-fg-2)]">{labels.empty}</p>}
        {rows?.map((r) => (
          <ReviewCard
            key={r.id}
            review={r}
            disabled={pending}
            onApprove={() => action(r.id, 'approve')}
            onReject={() => action(r.id, 'reject')}
            onReply={(text) => reply(r.id, text)}
            labels={labels}
          />
        ))}
      </div>
    </section>
  );
}

function ReviewCard({ review, disabled, onApprove, onReject, onReply, labels }: {
  review: Review;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  onReply: (text: string) => void;
  labels: Labels;
}) {
  const [replyText, setReplyText] = useState(review.reply ?? '');
  const [editingReply, setEditingReply] = useState(false);

  return (
    <article className="rounded-lg border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] p-5">
      <header className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-accent-cyan)]">{'★'.repeat(review.rating)}<span className="text-[var(--color-bg-3)]">{'★'.repeat(5 - review.rating)}</span></span>
          <span className="text-sm font-semibold text-[var(--color-fg-0)]">{review.authorName ?? 'Anonymous'}</span>
        </div>
        <span className="text-xs text-[var(--color-fg-2)]">{formatAthensDate(review.createdAt)}</span>
      </header>
      {review.title && <h3 className="text-sm font-semibold text-[var(--color-fg-0)]">{review.title}</h3>}
      {review.body && <p className="mt-2 text-sm text-[var(--color-fg-1)]">{review.body}</p>}

      {review.status === 'pending' && (
        <div className="mt-4 flex gap-2">
          <button type="button" disabled={disabled} onClick={onApprove} className="rounded bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-60">{labels.approve}</button>
          <button type="button" disabled={disabled} onClick={onReject} className="rounded bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/25 disabled:opacity-60">{labels.reject}</button>
        </div>
      )}

      {(review.status === 'approved' || editingReply) && (
        <div className="mt-4">
          {editingReply ? (
            <div className="flex flex-col gap-2">
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} maxLength={1000} className="w-full rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-0)] p-2 text-sm text-[var(--color-fg-0)]" />
              <div className="flex gap-2">
                <button type="button" disabled={disabled} onClick={() => { onReply(replyText); setEditingReply(false); }} className="rounded border border-[var(--color-accent-cyan)] px-2 py-1 text-xs text-[var(--color-accent-cyan)]">Save</button>
                <button type="button" onClick={() => setEditingReply(false)} className="rounded border border-[var(--color-bg-3)] px-2 py-1 text-xs text-[var(--color-fg-2)]">Cancel</button>
              </div>
            </div>
          ) : review.reply ? (
            <div className="rounded border-l-2 border-[var(--color-accent-cyan)] pl-3">
              <div className="text-xs text-[var(--color-fg-2)]">Owner reply</div>
              <p className="text-sm text-[var(--color-fg-1)]">{review.reply}</p>
              <button type="button" onClick={() => setEditingReply(true)} className="mt-1 text-xs text-[var(--color-fg-2)] hover:text-[var(--color-accent-cyan)]">Edit reply</button>
            </div>
          ) : (
            <button type="button" onClick={() => setEditingReply(true)} className="text-xs text-[var(--color-fg-2)] hover:text-[var(--color-accent-cyan)]">+ {labels.reply}</button>
          )}
        </div>
      )}
    </article>
  );
}

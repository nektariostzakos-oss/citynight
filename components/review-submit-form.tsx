'use client';

// Phase I.7 — token-protected review form. Posts to
// /api/sites/[id]/reviews/submit with the URL token.

import { useState, useTransition } from 'react';

export function ReviewSubmitForm({ siteId, token }: { siteId: string; token: string }) {
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/sites/${siteId}/reviews/submit`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token, rating,
          title: title.trim() || null,
          body: body.trim() || null,
          authorName: authorName.trim() || null,
          authorEmail: authorEmail.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? 'submit_failed'); return; }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="rounded-lg border p-6 text-center" style={{ borderColor: 'var(--site-muted, #888)' }}>
        <p className="text-lg font-semibold" style={{ color: 'var(--site-fg, #eee)' }}>Thank you.</p>
        <p className="mt-2 text-sm" style={{ color: 'var(--site-muted, #aaa)' }}>
          Your review has been submitted for approval.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-5">
      {error && (
        <p className="rounded border border-red-400/40 bg-red-50/10 p-3 text-sm" style={{ color: 'var(--site-fg, #eee)' }}>
          {error === 'already_finalised' ? "You've already submitted a review for this booking."
            : error === 'bad_token' ? 'This link is invalid or has expired.'
            : 'Could not submit. Please try again.'}
        </p>
      )}

      <div>
        <span className="block text-sm" style={{ color: 'var(--site-muted, #aaa)' }}>Rating</span>
        <div className="mt-2 flex gap-1 text-3xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)}
                    aria-label={`${n} stars`}
                    style={{ color: n <= rating ? 'var(--site-primary, gold)' : 'var(--site-muted, #555)' }}>
              ★
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="block text-sm mb-1" style={{ color: 'var(--site-muted, #aaa)' }}>Headline (optional)</span>
        <input type="text" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)}
               className="w-full rounded border p-3 text-sm" style={{ borderColor: 'var(--site-muted, #888)', color: 'var(--site-fg, #eee)', background: 'transparent' }} />
      </label>

      <label className="block">
        <span className="block text-sm mb-1" style={{ color: 'var(--site-muted, #aaa)' }}>Tell us more</span>
        <textarea maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} rows={5}
                  className="w-full rounded border p-3 text-sm" style={{ borderColor: 'var(--site-muted, #888)', color: 'var(--site-fg, #eee)', background: 'transparent' }} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm mb-1" style={{ color: 'var(--site-muted, #aaa)' }}>Your name</span>
          <input type="text" maxLength={80} value={authorName} onChange={(e) => setAuthorName(e.target.value)}
                 className="w-full rounded border p-3 text-sm" style={{ borderColor: 'var(--site-muted, #888)', color: 'var(--site-fg, #eee)', background: 'transparent' }} />
        </label>
        <label className="block">
          <span className="block text-sm mb-1" style={{ color: 'var(--site-muted, #aaa)' }}>Email (optional)</span>
          <input type="email" maxLength={200} value={authorEmail} onChange={(e) => setAuthorEmail(e.target.value)}
                 className="w-full rounded border p-3 text-sm" style={{ borderColor: 'var(--site-muted, #888)', color: 'var(--site-fg, #eee)', background: 'transparent' }} />
        </label>
      </div>

      <button type="submit" disabled={pending}
              className="rounded-lg px-5 py-3 text-sm font-semibold transition disabled:opacity-60"
              style={{ background: 'var(--site-primary, #444)', color: 'var(--site-bg, white)' }}>
        {pending ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  );
}

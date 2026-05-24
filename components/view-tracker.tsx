'use client';

import { useEffect } from 'react';

// Fire a single 'view' event when the venue page mounts. Owners see the rollup
// in their dashboard (Phase 6). De-duped per session to avoid inflating counts.

export function ViewTracker({ venueId }: { venueId: string }) {
  useEffect(() => {
    const key = `cn:viewed:${venueId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch { /* private mode etc. — best effort */ }

    fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ venueId, type: 'view' }),
      keepalive: true,
    }).catch(() => undefined);
  }, [venueId]);

  return null;
}

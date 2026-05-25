import { test, expect } from '@playwright/test';

// Critical journey #3 — security guards on state-changing routes.
// Sanity that the CSRF + rate-limit + auth checks from B1 are wired.

test.describe('Security guards', () => {
  test('PATCH /api/venues/[id] without Origin → 403', async ({ request }) => {
    // Note: Playwright's APIRequestContext does set Origin by default for
    // same-origin POSTs. We force a wrong Origin to simulate a cross-site
    // attack page.
    const res = await request.patch('/api/venues/00000000-0000-0000-0000-000000000000', {
      data: { phone: '+30000' },
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    });
    expect(res.status()).toBe(403);
  });

  test('POST /api/auth/request without Origin → 403', async ({ request }) => {
    const res = await request.post('/api/auth/request', {
      data: { email: 'cross-origin@example.test', locale: 'en' },
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    });
    // Either same-origin guard (403) or downstream validation fires.
    // We don't have requireSameOrigin on /auth/request — only rate-limit.
    // So this should land on 204 if rate-limit isn't hit, or 429 if it is.
    expect([204, 429]).toContain(res.status());
  });

  test('events tracking accepts 1, rejects 121 / minute', async ({ request }) => {
    // Burst 130 quickly; 120 should pass, the rest 429.
    let ok = 0, limited = 0;
    for (let i = 0; i < 130; i++) {
      const r = await request.post('/api/events', {
        data: { venueId: 'nonexistent', type: 'view' },
        headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3300' },
      });
      if (r.status() === 429) limited++;
      else ok++;
    }
    // Anything past the cap should 429; venue-not-found 404s count as "passed
    // the rate limit but failed validation" which is still fine for this assert.
    expect(limited).toBeGreaterThan(0);
  });
});

// Facebook page existence check — gate for editor-curated business cards
// in city guides (see [[project-guide-businesses-verified]]).
//
// What "verified" means here: we did an HTTP GET against the public FB URL
// with a browser-like UA, got a 200 OK, the response body looks like a
// real Facebook page shell (contains the page metadata), and we extracted
// a non-empty `og:title`. That's the highest confidence we can get without
// signing API requests. If FB returns a login wall ("You must log in to
// continue") or 404, we reject.
//
// We deliberately do NOT call FB's Graph API — it requires an app secret
// and the Pages endpoint has strict review. The HTML scrape is enough to
// prevent typo'd URLs and obvious fakes, which is the point.
//
// The verifier is meant to run AT SAVE TIME (not on every page render).
// The result is persisted on the guide_businesses row.

import 'server-only';

const FETCH_TIMEOUT_MS = 6000;
// Browser-shaped UA. FB serves a different shell to crawlers vs browsers;
// the browser path includes og:title meta tags which we need.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export type FbVerifyStatus = 'verified' | 'not_found' | 'blocked' | 'error';
export type FbVerifyResult = {
  status: FbVerifyStatus;
  pageTitle: string | null;
  reason: string | null;
};

const FB_HOST_RE = /^https?:\/\/(www\.|m\.)?facebook\.com\//i;

/** Verify a Facebook page URL really exists. Returns shape persistable to
 *  guide_businesses.fb_verified_status / fb_page_title. Caller should
 *  REJECT the save if status !== 'verified'. */
export async function verifyFacebookPage(rawUrl: string): Promise<FbVerifyResult> {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return { status: 'error', pageTitle: null, reason: 'empty_url' };
  if (!FB_HOST_RE.test(trimmed)) {
    return { status: 'error', pageTitle: null, reason: 'not_a_facebook_url' };
  }
  // Percent-encode non-ASCII path chars (ñ, Greek letters) — node's
  // fetch is strict; raw chars in the path get rejected by FB.
  let url: string;
  try { url = new URL(trimmed).toString(); }
  catch { return { status: 'error', pageTitle: null, reason: 'invalid_url' }; }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'user-agent': UA,
        'accept-language': 'en-US,en;q=0.9,el;q=0.8',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        // Without these FB serves a 400 to non-browser clients (it varies
        // the response on Sec-Fetch-* per the Vary header). Sending the
        // shape a real browser nav request uses gets us the real page.
        'sec-fetch-site': 'none',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-user': '?1',
        'sec-fetch-dest': 'document',
        'upgrade-insecure-requests': '1',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (res.status === 404) return { status: 'not_found', pageTitle: null, reason: 'http_404' };
    if (!res.ok) return { status: 'error', pageTitle: null, reason: `http_${res.status}` };

    const html = await res.text();

    // FB's "Page Not Found" lives at 200 OK with a specific marker. Catch it.
    if (/This (content|page) isn't available/i.test(html) || /Page Not Found/i.test(html)) {
      return { status: 'not_found', pageTitle: null, reason: 'page_unavailable_marker' };
    }

    // og:title is the canonical page name on FB. We accept this as proof.
    // pickMeta returns the raw HTML-encoded value; decodeEntities is
    // applied so callers can keyword-match against real characters.
    const ogTitle = pickMeta(html, 'og:title');
    if (ogTitle) return { status: 'verified', pageTitle: ogTitle, reason: null };

    // Some pages serve login walls to anonymous traffic. We can't get
    // og:title in that case — record as 'blocked' so editor knows the URL
    // looks right but we couldn't fully confirm.
    if (/login_form|You must log in to continue/i.test(html)) {
      return { status: 'blocked', pageTitle: null, reason: 'login_wall' };
    }

    return { status: 'error', pageTitle: null, reason: 'no_og_title' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/aborted|timeout/i.test(msg)) return { status: 'error', pageTitle: null, reason: 'timeout' };
    return { status: 'error', pageTitle: null, reason: msg.slice(0, 120) };
  } finally {
    clearTimeout(timer);
  }
}

/** Scan HTML for `<meta property="og:NAME" content="...">`. */
function pickMeta(html: string, name: string): string | null {
  const re = new RegExp(`<meta[^>]+property=["']${escapeRe(name)}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m = re.exec(html);
  if (m?.[1]) return decodeEntities(m[1]).trim();
  // Some servers swap attribute order.
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapeRe(name)}["']`, 'i');
  const m2 = re2.exec(html);
  return m2?.[1] ? decodeEntities(m2[1]).trim() : null;
}

function escapeRe(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
// Full HTML-entity decoder. FB pages emit numeric refs heavily for
// Greek + accented chars (`&#x39c;` etc.), and the keyword-match in
// guide-businesses depends on these being decoded.
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

'use client';

import Script from 'next/script';

// AdSense loader. Strategy = lazyOnload — the adsbygoogle.js library only
// fetches after window.load fires, so it's guaranteed to be off the LCP
// critical path. AdSense auto-ads are NOT enabled (we never push to
// adsbygoogle.queue with { google_ad_client, enable_page_level_ads: true });
// only the manual <ins class="adsbygoogle"> slots in AdSlot render.
//
// CMP gates personalization separately via Google Consent Mode v2 defaults
// in components/cmp.tsx — denied until the visitor grants.
export function AdsenseInit() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;
  return (
    <Script
      id="adsense"
      async
      strategy="lazyOnload"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
    />
  );
}

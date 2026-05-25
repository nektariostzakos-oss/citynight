'use client';

import Script from 'next/script';

// GA4 via gtag, gated by Google Consent Mode v2.
//
// Loading order on every page (locale layout):
//   1. <CmpInit /> — `beforeInteractive`, sets consent defaults to 'denied'.
//   2. <Ga4 />     — `afterInteractive`, registers the GA4 config but no
//                    event will fire until the CMP grants ad/analytics
//                    storage (we set `wait_for_update: 500` in CmpInit so
//                    GA holds events briefly while the CMP boots).
//   3. <AdsenseInit /> — `lazyOnload`.
//
// No fires-before-consent: gtag honours the consent state set by CmpInit.
// Verifying live: open DevTools → Network → filter "google-analytics" before
// clicking Allow on the CMP — you should see zero requests.

export function Ga4() {
  const id = process.env.NEXT_PUBLIC_GA4_ID;
  if (!id) return null;
  return (
    <>
      <Script
        id="ga4-loader"
        async
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
      />
      <Script id="ga4-config" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        // Send the page_view as a standard event. GA4 will queue it until
        // analytics_storage flips to 'granted' (set by the CMP).
        gtag('config', '${id}', {
          anonymize_ip: true,
          send_page_view: true,
          transport_type: 'beacon',
        });
      `}</Script>
    </>
  );
}

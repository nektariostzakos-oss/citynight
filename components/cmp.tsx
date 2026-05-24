'use client';

// Google Consent Mode v2 default state + CMP bootstrap.
// We set defaults BEFORE the CMP loads so ad/analytics scripts that may fire on
// first paint always see a defined (denied) state. The CMP then updates state
// based on the user's choice. AdSense respects consent automatically.

import Script from 'next/script';

export function CmpInit() {
  const cmpSiteId = process.env.NEXT_PUBLIC_CMP_SITE_ID;
  if (!cmpSiteId) return null;

  return (
    <>
      <Script id="consent-default" strategy="beforeInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        // EEA-safe defaults: everything denied until the CMP grants it.
        gtag('consent', 'default', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
          functionality_storage: 'granted',
          security_storage: 'granted',
          wait_for_update: 500,
        });
        gtag('set', 'ads_data_redaction', true);
        gtag('set', 'url_passthrough', true);
      `}</Script>

      {/* CMP loader. The CMP script URL is provider-specific; we keep the site id
          in env so swapping CMPs (Funding Choices → Cookiebot → etc.) is config-only. */}
      <Script
        id="cmp-loader"
        async
        src={`https://fundingchoicesmessages.google.com/i/${cmpSiteId}?ers=1`}
        strategy="afterInteractive"
      />
      <Script id="cmp-signal" strategy="afterInteractive">{`
        (function(){function r(l){var c=document.body;c&&l();}var x=window.googlefc=window.googlefc||{};x.callbackQueue=x.callbackQueue||[];})();
      `}</Script>
    </>
  );
}

import Script from 'next/script';

// Display ad slot. AdSense at launch (§11), GAM-ready slot markup so direct-sold
// or backfill via GAM is a config swap, not a refactor. The CMP (consent-mode v2)
// gates personalization in the EEA; AdSense reads consent automatically.
//
// Pure server component — no client boundary needed. AdSense's per-slot push is
// done via <Script> with strategy="afterInteractive", which Next renders in the
// document and the browser runs on hydration.

export function AdSlot({ id, scope }: { id: string; scope: 'site' | 'section' | 'category' }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  if (!client) {
    return (
      <div
        data-slot-id={id}
        data-slot-scope={scope}
        className="flex h-24 w-full items-center justify-center rounded-md border border-dashed border-[var(--color-bg-3)] text-xs uppercase tracking-widest text-[var(--color-fg-3)]"
      >
        Ad slot · {scope}
      </div>
    );
  }

  return (
    <div data-slot-id={id} data-slot-scope={scope} className="min-h-[6rem] w-full">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={id}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <Script id={`ad-${id}`} strategy="afterInteractive">
        {`(adsbygoogle = window.adsbygoogle || []).push({});`}
      </Script>
    </div>
  );
}

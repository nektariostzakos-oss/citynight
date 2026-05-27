/**
 * template2 theme — "Porcelain & Rose" in light and dark.
 *
 * The `--t2-*` primitives are redefined under `[data-theme="dark"]`; the demo's
 * own theme variables (`--background`, `--gold`, ...) map onto them, so the
 * shared Nav / Footer follow and the Nav's dark/light toggle drives the whole
 * template. CSS variables resolve lazily, so mapping them once in `:root` is
 * enough — the dark block only needs to restate the primitives.
 */
export const T2_CSS = `
html:root{
  --t2-bg:#faf7f5;
  --t2-ink:#26201d;
  --t2-rose:#b07f86;
  --t2-rose-deep:#9a6168;
  --t2-blush:#f2e6e4;
  --t2-muted:#6b5f57;
  --t2-muted2:#9a8d84;
  --t2-border:#ebe3dd;
  --t2-border-strong:#ddd0c8;
  --t2-card:#ffffff;
  --t2-on-ink-soft:#d8cfc8;
  --background:var(--t2-bg);--foreground:var(--t2-ink);
  --gold:var(--t2-rose);--gold-2:var(--t2-rose-deep);
  --surface:var(--t2-card);--surface-strong:var(--t2-blush);
  --border:var(--t2-border);--border-strong:var(--t2-border-strong);
  --muted:var(--t2-muted);--muted-2:var(--t2-muted2);
  --nav-bg:color-mix(in srgb,var(--t2-bg) 88%,transparent);
  --font-heading:var(--font-fraunces);--font-body:var(--font-geist-sans);
}
html:not(.light){
  --t2-bg:#181311;
  --t2-ink:#f4ebe6;
  --t2-rose:#cf9ba1;
  --t2-rose-deep:#e3b9bd;
  --t2-blush:#241c1a;
  --t2-muted:#b7a89f;
  --t2-muted2:#8a7c73;
  --t2-border:#352c28;
  --t2-border-strong:#473a34;
  --t2-card:#221b18;
  --t2-on-ink-soft:#6b5f57;
}
@keyframes t2marquee{from{transform:translateX(0)}to{transform:translateX(-100%)}}
.t2-marq{animation:t2marquee 38s linear infinite}
@keyframes t2rise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
.t2-rise{animation:t2rise .7s cubic-bezier(.22,1,.36,1) both}
@media (prefers-reduced-motion:reduce){.t2-marq,.t2-rise{animation:none}}
`;

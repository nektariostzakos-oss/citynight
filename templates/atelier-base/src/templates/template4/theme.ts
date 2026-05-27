/**
 * template4 theme — "Clinic" in light and dark.
 *
 * A clinical-luxe palette for the aesthetics / med-spa skin: a cool pale
 * ground, deep navy ink, a calm clinical blue accent. The `--t4-*` primitives
 * are redefined under the dark block; the demo's own theme variables map onto
 * them, so the shared Nav / Footer follow and the dark/light toggle drives the
 * whole template. Headings use Manrope (a precise geometric sans) — the only
 * sans-headed template, which sets it apart from the three serif skins.
 */
export const T4_CSS = `
html:root{
  --t4-bg:#f3f5f7;
  --t4-ink:#1b2330;
  --t4-blue:#3f6f9c;
  --t4-blue-deep:#2f567c;
  --t4-mist:#e8ebef;
  --t4-muted:#54606e;
  --t4-muted2:#8b95a1;
  --t4-border:#dfe3e8;
  --t4-border-strong:#c8d0d9;
  --t4-card:#ffffff;
  --t4-on-ink-soft:#aab8c6;
  --background:var(--t4-bg);--foreground:var(--t4-ink);
  --gold:var(--t4-blue);--gold-2:var(--t4-blue-deep);
  --surface:var(--t4-card);--surface-strong:var(--t4-mist);
  --border:var(--t4-border);--border-strong:var(--t4-border-strong);
  --muted:var(--t4-muted);--muted-2:var(--t4-muted2);
  --nav-bg:color-mix(in srgb,var(--t4-bg) 90%,transparent);
  --font-heading:var(--font-manrope);--font-body:var(--font-geist-sans);
}
html:not(.light){
  --t4-bg:#12161c;
  --t4-ink:#eef1f4;
  --t4-blue:#74a3cb;
  --t4-blue-deep:#9cc0de;
  --t4-mist:#1a2028;
  --t4-muted:#a6afbb;
  --t4-muted2:#79828f;
  --t4-border:#262d37;
  --t4-border-strong:#353e4a;
  --t4-card:#181d25;
  --t4-on-ink-soft:#5a6573;
}
@keyframes t4rise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.t4-rise{animation:t4rise .7s cubic-bezier(.22,1,.36,1) both}
@media (prefers-reduced-motion:reduce){.t4-rise{animation:none}}
`;

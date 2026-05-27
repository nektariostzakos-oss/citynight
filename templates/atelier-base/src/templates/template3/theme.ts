/**
 * template3 theme — "Sage & Stone" in light and dark.
 *
 * The `--t3-*` primitives are redefined under `[data-theme="dark"]`; the demo's
 * own theme variables (`--background`, `--gold`, ...) map onto them, so the
 * shared Nav / Footer follow and the Nav's dark/light toggle drives the whole
 * template. CSS variables resolve lazily, so mapping them once in `:root` is
 * enough — the dark block only needs to restate the primitives.
 *
 * The day spa design leans on one motif: the arch. Image frames, ornaments and
 * the closing CTA all echo a spa-window curve, which keeps it distinct from the
 * square-card templates.
 */
export const T3_CSS = `
html:root{
  --t3-bg:#f6f3ec;
  --t3-ink:#23271f;
  --t3-sage:#7c8a66;
  --t3-sage-deep:#5e6b4c;
  --t3-mist:#ece9de;
  --t3-muted:#5d6053;
  --t3-muted2:#8b8a7c;
  --t3-border:#e2ddcd;
  --t3-border-strong:#d2ccba;
  --t3-card:#ffffff;
  --t3-on-ink-soft:#cdd0bf;
  --background:var(--t3-bg);--foreground:var(--t3-ink);
  --gold:var(--t3-sage);--gold-2:var(--t3-sage-deep);
  --surface:var(--t3-card);--surface-strong:var(--t3-mist);
  --border:var(--t3-border);--border-strong:var(--t3-border-strong);
  --muted:var(--t3-muted);--muted-2:var(--t3-muted2);
  --nav-bg:color-mix(in srgb,var(--t3-bg) 88%,transparent);
  --font-heading:var(--font-cormorant);--font-body:var(--font-geist-sans);
}
html:not(.light){
  --t3-bg:#15170f;
  --t3-ink:#eef0e4;
  --t3-sage:#9aa982;
  --t3-sage-deep:#b7c4a0;
  --t3-mist:#1d1f16;
  --t3-muted:#aeb0a0;
  --t3-muted2:#7f8270;
  --t3-border:#2b2e22;
  --t3-border-strong:#3c4031;
  --t3-card:#1c1e15;
  --t3-on-ink-soft:#5d6053;
}
@keyframes t3rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.t3-rise{animation:t3rise .8s cubic-bezier(.22,1,.36,1) both}
@media (prefers-reduced-motion:reduce){.t3-rise{animation:none}}
`;

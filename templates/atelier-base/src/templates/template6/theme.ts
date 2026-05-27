/**
 * template6 theme — "Maison Loré" in light and dark.
 *
 * A fashion-magazine palette for the upscale hair-salon skin: cream paper,
 * slate ink, champagne gold accent, dusty rose. Headlines use Playfair
 * Display (the editorial serif), body uses Inter, and pull-quotes use
 * Cormorant Garamond italic — the magazine triple that sets this skin
 * apart. The `--t6-*` primitives are redefined under the dark block; the
 * demo's own theme variables map onto them.
 */
export const T6_CSS = `
html:root{
  --t6-paper:#faf5ec;
  --t6-card:#ffffff;
  --t6-ink:#20242a;
  --t6-ink-soft:#a39684;
  --t6-gold:#b69457;
  --t6-gold-deep:#8e7339;
  --t6-rose:#d2a08e;
  --t6-mist:#ece4d2;
  --t6-muted:#5a5f68;
  --t6-muted2:#8b909b;
  --t6-border:#e0d4b9;
  --t6-border-strong:#c9b88f;
  --background:var(--t6-paper);--foreground:var(--t6-ink);
  --gold:var(--t6-gold);--gold-2:var(--t6-gold-deep);
  --surface:var(--t6-card);--surface-strong:var(--t6-mist);
  --border:var(--t6-border);--border-strong:var(--t6-border-strong);
  --muted:var(--t6-muted);--muted-2:var(--t6-muted2);
  --nav-bg:color-mix(in srgb,var(--t6-paper) 90%,transparent);
  --font-heading:var(--font-playfair);--font-body:var(--font-inter);
}
html:not(.light){
  --t6-paper:#15171b;
  --t6-card:#1c1f24;
  --t6-ink:#f0e9da;
  --t6-ink-soft:#7a6e58;
  --t6-gold:#c9a565;
  --t6-gold-deep:#dfba78;
  --t6-rose:#d8a890;
  --t6-mist:#1b1e22;
  --t6-muted:#a3a9b5;
  --t6-muted2:#6a6e78;
  --t6-border:#2a2d32;
  --t6-border-strong:#3b3e44;
}
h1,h2,h3{font-family:var(--font-playfair),Georgia,serif}
.t6-caps{text-transform:uppercase;letter-spacing:0.22em;font-weight:600;font-size:11px}
.t6-italic{font-family:var(--font-cormorant),Georgia,serif;font-style:italic;font-weight:500}
.t6-rule{height:1px;background:var(--t6-border-strong)}
@keyframes t6rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
.t6-rise{animation:t6rise .7s cubic-bezier(.22,1,.36,1) both}
@media (prefers-reduced-motion:reduce){.t6-rise{animation:none}}
`;

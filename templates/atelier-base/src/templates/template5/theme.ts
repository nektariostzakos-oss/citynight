/**
 * template5 theme — "Marigold" in light and dark.
 *
 * A warm, sun-baked palette for the yoga / movement studio skin: a cream
 * paper ground, deep warm-brown ink, a marigold accent, with olive, clay and
 * rose as the rotating collage tones. The `--t5-*` primitives are redefined
 * under the dark block; the demo's own theme variables map onto them, so the
 * shared Nav / Footer follow and the dark/light toggle drives the whole
 * template. Headings use Bricolage Grotesque (a contemporary display sans with
 * real personality) and accent words use Fraunces italic — the collage skin's
 * deliberate type clash, unlike the three quieter sibling templates.
 */
export const T5_CSS = `
html:root{
  --t5-paper:#f4ebd8;
  --t5-card:#fcf5e4;
  --t5-ink:#2c2114;
  --t5-ink-soft:#b3a487;
  --t5-marigold:#d9851d;
  --t5-marigold-deep:#b16c12;
  --t5-olive:#6c7842;
  --t5-clay:#bd5d3a;
  --t5-rose:#cf8367;
  --t5-mist:#ece0c5;
  --t5-muted:#6a5c44;
  --t5-muted2:#9b8a6c;
  --t5-border:#ddcca6;
  --t5-border-strong:#c6b07f;
  --background:var(--t5-paper);--foreground:var(--t5-ink);
  --gold:var(--t5-marigold);--gold-2:var(--t5-marigold-deep);
  --surface:var(--t5-card);--surface-strong:var(--t5-mist);
  --border:var(--t5-border);--border-strong:var(--t5-border-strong);
  --muted:var(--t5-muted);--muted-2:var(--t5-muted2);
  --nav-bg:color-mix(in srgb,var(--t5-paper) 88%,transparent);
  --font-heading:var(--font-bricolage);--font-body:var(--font-geist-sans);
}
html:not(.light){
  --t5-paper:#1c1610;
  --t5-card:#261d13;
  --t5-ink:#f1e7d2;
  --t5-ink-soft:#6f6047;
  --t5-marigold:#ed9f3a;
  --t5-marigold-deep:#f2b865;
  --t5-olive:#9da876;
  --t5-clay:#dd8862;
  --t5-rose:#e0a489;
  --t5-mist:#241b11;
  --t5-muted:#b2a386;
  --t5-muted2:#7d6e55;
  --t5-border:#352a1b;
  --t5-border-strong:#493a20;
}
h1,h2,h3{font-family:var(--font-bricolage),system-ui,sans-serif}
.t5-accent{font-family:var(--font-fraunces),Georgia,serif;font-style:italic;font-weight:500}
.t5-grain{background-image:radial-gradient(var(--t5-ink) .55px,transparent .55px);background-size:7px 7px}
.t5-mark{box-decoration-break:clone;-webkit-box-decoration-break:clone}
@keyframes t5rise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
.t5-rise{animation:t5rise .7s cubic-bezier(.22,1,.36,1) both}
@keyframes t5marq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.t5-marq{animation:t5marq 34s linear infinite}
@keyframes t5spin{to{transform:rotate(360deg)}}
.t5-spin{animation:t5spin 26s linear infinite}
@media (prefers-reduced-motion:reduce){
  .t5-rise{animation:none}.t5-marq{animation:none}.t5-spin{animation:none}
}
`;

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLang } from "../../lib/i18n";
import { useSection } from "../../lib/editorClient";
import { useTheme } from "../../lib/theme";
import { withBasePath, clientPath } from "../../lib/basePath";
import EditPencil from "./EditPencil";

export type NextSlotInfo = {
  time: string;          // "14:30" or ""
  label_en: string;      // "Today", "Tomorrow", "Mon", or "Closed today"
  booked: boolean;       // true if no slot available
  /** True when the shop is open today per business hours (computed server
   *  side so the hero pill never causes a timezone hydration mismatch). */
  openToday?: boolean;
  /** Per-language day label: label_en (above), label_el, label_de, ... */
  [key: `label_${string}`]: string;
} | null;

/**
 * The hero ships three pickable layouts (chosen in the install wizard or the
 * live editor, stored as the `heroLayout` content field):
 *
 *  - `split`    the classic two-image layout: headline beside a portrait card.
 *  - `video`    a full-bleed background video with the headline centred over it.
 *  - `showcase` a static background with a phone mock-up that live-previews the
 *               owner's own site (an iframe of `/preview`).
 *
 * `split` is the default, so existing sites and the `/barber` showcase keep
 * today's look with no content migration.
 */
export const HERO_LAYOUTS = ["split", "video", "showcase"] as const;
export type HeroLayout = (typeof HERO_LAYOUTS)[number];

export default function Hero({
  nextSlot,
  minPrice,
  demoMode,
  framed,
}: {
  nextSlot?: NextSlotInfo;
  minPrice?: number | null;
  demoMode?: boolean;
  /** True when this hero is itself rendered inside the showcase phone's
   *  preview iframe. The phone mock-up is then suppressed, which is what
   *  stops `/preview` -> hero -> phone -> `/preview` recursing forever. */
  framed?: boolean;
}) {
  const { t, lang } = useLang();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = useSection("hero", {
    pill_en: t("hero.pill"),
    pill_el: t("hero.pill"),
    title_en: t("hero.title"),
    title_el: t("hero.title"),
    titleAccent_en: t("hero.title_accent"),
    titleAccent_el: t("hero.title_accent"),
    subtitle_en: t("hero.subtitle"),
    subtitle_el: t("hero.subtitle"),
    meta1_en: t("hero.meta1"),
    meta1_el: t("hero.meta1"),
    meta2_en: t("hero.meta2"),
    meta2_el: t("hero.meta2"),
    // Empty by default: a "start fresh" install has no images. The barber
    // showcase supplies bgImage / sideImage / sideName from its content.json.
    bgImage: "",
    sideImage: "",
    sideRole_en: t("hero.role"),
    sideRole_el: t("hero.role"),
    sideName: "",
    bgVideo: "",
    bgVideoPoster: "",
    bgOpacity: 90,
    overlayStrength: 35,
    // Which of the three layouts to render. Absent => "split" (today's look).
    heroLayout: "split",
  });
  const pick = (en: string, el: string) => (lang === "el" ? el || en : en);
  const title = pick(c.title_en, c.title_el);
  const title2 = pick(c.titleAccent_en, c.titleAccent_el);

  const layout: HeroLayout = (HERO_LAYOUTS as readonly string[]).includes(
    c.heroLayout,
  )
    ? (c.heroLayout as HeroLayout)
    : "split";
  // The phone mock-up only exists in the showcase layout, and never when this
  // hero is itself inside the preview iframe.
  const showPhone = layout === "showcase" && !framed;
  // A two-column grid carries the side card (split) or the phone (showcase).
  // The video layout, and a framed showcase hero, lay the text out on its own.
  const isGrid = layout === "split" || showPhone;
  const centered = layout === "video";

  const youTubeId = extractYouTubeId(c.bgVideo);
  const vimeoId = extractVimeoId(c.bgVideo);
  const bgOpacity =
    Math.max(0, Math.min(100, Number(c.bgOpacity ?? 90))) / 100;
  const overlay =
    Math.max(0, Math.min(100, Number(c.overlayStrength ?? 35))) / 100;
  // The video layout shows the clip; the other two always show the image.
  const wantVideo = layout === "video" && !!c.bgVideo;

  // textBlock is the LCP region on the demo home. To keep LCP stable we
  // render every node in its SSR-final position (no opacity:0, no y-offset)
  // and let framer-motion run only the cosmetic CTA hover micro-interactions
  // below the fold. The previous staggered word-by-word entrance pushed LCP
  // past 7 seconds because Lighthouse kept attributing later motion frames
  // as the largest paint event.
  const textBlock = (
    <div className={centered ? "flex flex-col items-center text-center" : ""}>
      <div
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-[var(--gold)]"
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--gold)]" />
        {/* Live open/closed status from today's business hours, computed
            server-side (see computeNextSlot) so there is no tz flicker. */}
        {nextSlot?.openToday === false ? t("closed_today") : t("today")}
      </div>

      <h1 className="font-serif text-6xl font-semibold leading-[1] tracking-tight sm:text-7xl md:text-8xl lg:text-[7.5rem]">
        {title.split(" ").map((w, i) => (
          <span key={i} className="mr-3 inline-block">
            {w}
          </span>
        ))}
        <br />
        {title2.split(" ").map((w, i) => (
          <span key={i} className="mr-3 inline-block italic text-[var(--gold)]">
            {w}
          </span>
        ))}
      </h1>

      <p
        className="mt-8 max-w-xl text-lg leading-relaxed sm:text-xl"
        style={{ color: "var(--muted)" }}
      >
        {pick(c.subtitle_en, c.subtitle_el)}
      </p>

      <div
        className={`mt-10 flex flex-wrap items-center gap-4 ${
          centered ? "justify-center" : ""
        }`}
      >
        <div className="transition-transform hover:scale-[1.04] active:scale-[0.97]">
          <Link
            href="/book"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-8 py-4 text-sm font-semibold uppercase tracking-widest text-black"
          >
            {t("cta.book")}
          </Link>
        </div>
        <div className="transition-transform hover:scale-[1.04] active:scale-[0.97]">
          <Link
            href="/services"
            className="inline-block rounded-full border px-8 py-4 text-sm font-semibold uppercase tracking-widest backdrop-blur transition-colors"
            style={{
              borderColor: "var(--border-strong)",
              background: "var(--surface)",
              color: "var(--foreground)",
            }}
          >
            {t("cta.see")}
          </Link>
        </div>
        {demoMode && (
          <div className="transition-transform hover:scale-[1.04] active:scale-[0.97]">
            <Link
              href="/admin/login?auto=1"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--gold)] px-8 py-4 text-sm font-semibold uppercase tracking-widest text-[var(--gold)] transition-colors hover:bg-[var(--gold)] hover:text-black"
            >
              {({ el: "Δοκιμάστε το admin", de: "Admin testen", it: "Prova l'admin" } as Record<string, string>)[lang] || "Try the admin"} →
            </Link>
          </div>
        )}
      </div>

      <div
        className={`mt-12 flex items-center gap-8 text-xs uppercase tracking-widest ${
          centered ? "justify-center" : ""
        }`}
        style={{ color: "var(--muted-2)" }}
      >
        <span>{pick(c.meta1_en, c.meta1_el)}</span>
        <span className="hidden sm:block">{pick(c.meta2_en, c.meta2_el)}</span>
      </div>
    </div>
  );

  return (
    <section className="relative flex min-h-[100vh] items-center overflow-hidden px-6 pt-32 pb-20">
      <EditPencil section="hero" />
      <div className="absolute inset-0 overflow-hidden">
        {wantVideo && youTubeId ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youTubeId}?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&playsinline=1&rel=0&showinfo=0&disablekb=1&iv_load_policy=3&playlist=${youTubeId}`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Hero background"
              className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-[100vh] w-[177.77vh] min-w-[100vw] -translate-x-1/2 -translate-y-1/2 border-0"
            />
          </div>
        ) : wantVideo && vimeoId ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}?background=1&autoplay=1&loop=1&muted=1`}
              allow="autoplay; picture-in-picture"
              allowFullScreen
              title="Hero background"
              className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-[100vh] w-[177.77vh] min-w-[100vw] -translate-x-1/2 -translate-y-1/2 border-0"
            />
          </div>
        ) : wantVideo ? (
          <video
            src={c.bgVideo}
            poster={c.bgVideoPoster || c.bgImage}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: isLight ? Math.min(bgOpacity, 0.7) : bgOpacity }}
          />
        ) : c.bgImage ? (
          <Image
            src={withBasePath(c.bgImage)}
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
            style={{ opacity: isLight ? Math.min(bgOpacity, 0.55) : bgOpacity }}
            className="object-cover"
          />
        ) : null}
        {isLight ? (
          // Light mode: dim the photo/video with a steady cream wash so the
          // dark foreground text reads cleanly.
          <div
            className="absolute inset-0"
            style={{
              background: `color-mix(in srgb, var(--background) 55%, transparent)`,
            }}
          />
        ) : centered ? (
          // Video layout: the text sits centred over the clip, so a flat wash
          // plus a bottom fade keeps it readable from every side.
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `color-mix(in srgb, var(--background) ${
                  35 + overlay * 45
                }%, transparent)`,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, transparent 55%, var(--background))`,
              }}
            />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom,
                  color-mix(in srgb, var(--background) ${overlay * 50}%, transparent),
                  color-mix(in srgb, var(--background) ${overlay * 100}%, transparent),
                  var(--background))`,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to right, var(--background), transparent ${Math.max(30, 60 - overlay * 50)}%)`,
              }}
            />
          </>
        )}
      </div>

      {isGrid ? (
        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          {textBlock}
          {layout === "split" ? (
            <SideCard
              sideImage={c.sideImage}
              sideName={c.sideName}
              sideRole={pick(c.sideRole_en, c.sideRole_el)}
              nextSlot={nextSlot}
              lang={lang}
            />
          ) : (
            <PhoneShowcase label={t("hero.phone_preview")} />
          )}
        </div>
      ) : (
        <div
          className={`relative z-10 mx-auto w-full ${
            centered ? "max-w-4xl" : "max-w-3xl"
          }`}
        >
          {textBlock}
        </div>
      )}
    </section>
  );
}

/**
 * The classic side portrait card with the floating "next slot" badge.
 *
 * Previously wrapped in motion.div with an x:40→0 entrance and an infinite
 * y-oscillation on the badge. Both have been removed: the side image is the
 * LCP candidate on desktop (and a strong CLS contender on mobile if the
 * card animates after FCP), so it now renders in its SSR-final position.
 * The badge's infinite hover is replaced by a CSS keyframe that runs only
 * after first paint, keeping the main thread free during LCP measurement.
 */
function SideCard({
  sideImage,
  sideName,
  sideRole,
  nextSlot,
  lang,
}: {
  sideImage: string;
  sideName: string;
  sideRole: string;
  nextSlot?: NextSlotInfo;
  lang: string;
}) {
  return (
    <div className="relative hidden lg:block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-[var(--gold)]/20">
        {sideImage ? (
          <Image
            src={withBasePath(sideImage)}
            alt={sideName || ""}
            fill
            priority
            loading="eager"
            fetchPriority="high"
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "var(--surface)" }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <p className="text-xs uppercase tracking-widest text-[var(--gold)]">
            {sideRole}
          </p>
          <p className="mt-1 font-serif text-2xl">{sideName}</p>
        </div>
      </div>
      <div
        className="absolute -bottom-6 -left-6 hidden rounded-xl border p-4 backdrop-blur xl:block"
        style={{
          borderColor: "var(--border)",
          background: "var(--nav-bg)",
        }}
      >
        <p className="text-xs uppercase tracking-widest text-[var(--gold)]">
          {nextSlot?.booked
            ? (({ el: "Σήμερα γεμάτο", de: "Heute ausgebucht", it: "Tutto prenotato oggi" } as Record<string, string>)[lang] || "Fully booked today")
            : (({ el: "Επόμενη θέση", de: "Nächster Platz", it: "Prossimo slot" } as Record<string, string>)[lang] || "Next slot")}
        </p>
        <p className="mt-1 font-serif text-xl">
          {nextSlot && nextSlot.time
            ? `${nextSlot[`label_${lang}`] || nextSlot.label_en} · ${nextSlot.time}`
            : (({ el: "Δείτε το ημερολόγιο", de: "Kalender ansehen", it: "Vedi il calendario" } as Record<string, string>)[lang] || "See the calendar")}
        </p>
      </div>
    </div>
  );
}

/**
 * A phone mock-up whose screen is a live, scaled iframe of `/preview` — the
 * owner's own homepage rendered "framed" (its hero drops the phone, so this
 * never recurses). The iframe is pointer-events-none: it is a decoration, not
 * an interactive surface, and must not trap the page scroll.
 */
function PhoneShowcase({ label }: { label: string }) {
  // Real mobile viewport, scaled down to fit the phone's screen window.
  const SCREEN_W = 280;
  const SCREEN_H = 600;
  const FRAME_W = 390;
  const scale = SCREEN_W / FRAME_W;
  // The iframe src is resolved after mount: `/preview` must carry the live
  // tenant slug (`/<slug>/preview`), and `clientPath` is client-only — setting
  // it post-mount keeps SSR and the first client render identical (no src),
  // so there is no hydration mismatch and the iframe loads exactly once.
  const [src, setSrc] = useState("");
  useEffect(() => {
    setSrc(clientPath("/preview"));
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative hidden justify-center lg:flex"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="relative rounded-[2.75rem] border-[10px] border-[#15110d] bg-[#15110d] shadow-2xl"
        style={{ width: SCREEN_W + 20 }}
      >
        {/* notch */}
        <div className="absolute left-1/2 top-0 z-10 h-[18px] w-28 -translate-x-1/2 rounded-b-2xl bg-[#15110d]" />
        <div
          className="relative overflow-hidden rounded-[2rem] bg-[var(--background)]"
          style={{ width: SCREEN_W, height: SCREEN_H }}
        >
          {src ? (
            <iframe
              src={src}
              title={label}
              loading="lazy"
              tabIndex={-1}
              scrolling="no"
              className="pointer-events-none origin-top-left border-0"
              style={{
                width: FRAME_W,
                height: SCREEN_H / scale,
                transform: `scale(${scale})`,
              }}
            />
          ) : null}
        </div>
      </motion.div>
      <span
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-[var(--gold)] backdrop-blur"
        style={{ borderColor: "var(--border)", background: "var(--nav-bg)" }}
      >
        {label}
      </span>
    </motion.div>
  );
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  if (!/youtu\.?be/i.test(url)) return null;
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
    /\/v\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

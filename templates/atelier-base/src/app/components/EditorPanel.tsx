"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor } from "../../lib/editorClient";
import { useLang } from "../../lib/i18n";
import { LANG_NAMES, type Lang } from "../../lib/langs";
import ImagePicker from "./ImagePicker";

export default function EditorPanel() {
  const { editing, closeEditor, content, preview, setPreview, commitPreview, discardPreview, getDefaults } =
    useEditor();
  const { lang, enabled, setLang } = useLang();

  const [editLang, setEditLang] = useState<Lang>("en");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  // Focus trap
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<Element | null>(null);
  // Language the visitor was viewing before the editor opened — restored on close.
  const originalLang = useRef<Lang>("en");

  // On open: remember the trigger + the live language, start editing in it.
  useEffect(() => {
    if (editing) {
      triggerRef.current = document.activeElement;
      originalLang.current = lang;
      setEditLang(lang);
      setError(false);
    }
    // Only react to the editor opening/closing — not to language changes,
    // which the panel itself drives while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // Move focus into panel when it opens
  useEffect(() => {
    if (!editing || !panelRef.current) return;
    const first = panelRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    first?.focus();
  }, [editing]);

  // ESC closes + focus trap
  useEffect(() => {
    if (!editing) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!editing) return null;

  // Working copy: persisted content with the live, unsaved preview layered on.
  // Raw (per-language) values — the page resolves to one language, the panel
  // edits each language directly.
  const working: Record<string, unknown> = {
    ...(getDefaults(editing) ?? {}),
    ...(content[editing] ?? {}),
    ...(preview[editing] ?? {}),
  };

  function setField(key: string, value: unknown) {
    setPreview(editing!, { [key]: value });
  }

  // Switch which language the panel edits, and flip the page preview to it
  // so the owner sees the translation in real context.
  function pickLang(l: Lang) {
    setEditLang(l);
    setLang(l);
  }

  function handleClose() {
    discardPreview();
    setLang(originalLang.current);
    if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
    closeEditor();
  }

  async function save() {
    setSaving(true);
    setError(false);
    const ok = await commitPreview();
    setSaving(false);
    if (ok) {
      setLang(originalLang.current);
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
      closeEditor();
    } else {
      setError(true);
    }
  }

  return (
    <>
      {/* Backdrop: keyboard-accessible close via ESC (handled above); click also closes */}
      <div
        onClick={handleClose}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClose(); }}
        role="presentation"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 99,
        }}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Edit section: ${editing}`}
        tabIndex={-1}
        className="atelier-editor-panel is-open"
      >
        <div className="atelier-editor-panel__head">
          <p className="atelier-editor-panel__title">{editing}</p>
          <button
            onClick={handleClose}
            aria-label="Close editor panel"
            style={{
              background: "none",
              border: 0,
              color: "var(--foreground)",
              fontSize: 22,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
        <div className="atelier-editor-panel__body">
          <LangBar langs={enabled} active={editLang} onPick={pickLang} />
          {renderForm(editing, working, setField, editLang)}
        </div>
        <div className="atelier-editor-panel__foot">
          {error && (
            <span style={{ marginRight: "auto", color: "#fca5a5", fontSize: 12 }}>
              Save failed. Try again.
            </span>
          )}
          <button
            onClick={handleClose}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid var(--border-strong)",
              background: "transparent",
              color: "var(--foreground)",
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              border: 0,
              background: "var(--gold)",
              color: "#000",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </aside>
    </>
  );
}

/* ============== language tab bar ============== */

function LangBar({
  langs,
  active,
  onPick,
}: {
  langs: Lang[];
  active: Lang;
  onPick: (l: Lang) => void;
}) {
  if (langs.length < 2) return null;
  return (
    <div
      style={{
        marginBottom: 16,
        paddingBottom: 14,
        borderBottom: "1px solid var(--border)",
      }}
    >
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 10,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--muted-2)",
        }}
      >
        Translate
      </p>
      {/* One dropdown switcher — pick a language, edit that language's
          fields below. Scales cleanly to all enabled languages. */}
      <select
        value={active}
        onChange={(e) => onPick(e.target.value as Lang)}
        aria-label="Language to translate"
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid var(--border-strong)",
          background: "var(--surface)",
          color: "var(--foreground)",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {langs.map((l) => (
          <option key={l} value={l}>
            {LANG_NAMES[l]}
          </option>
        ))}
      </select>
      {active !== "en" && (
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--muted-2)" }}>
          Untranslated fields fall back to English for visitors.
        </p>
      )}
    </div>
  );
}

/* ============== forms per section ============== */

type SetFn = (k: string, v: unknown) => void;

function renderForm(
  section: string,
  draft: Record<string, unknown>,
  set: SetFn,
  L: Lang
) {
  // Template-skin sections (template2 / template3) are schema-driven — one
  // entry in TEMPLATE_FORMS below describes the whole form.
  if (TEMPLATE_FORMS[section]) return renderSchema(TEMPLATE_FORMS[section], draft, set, L);

  if (section === "hero") {
    const heroLayout = String(draft.heroLayout ?? "split");
    return (
      <>
        <SubHeading>Hero layout</SubHeading>
        <LayoutPicker
          value={heroLayout}
          onChange={(v) => set("heroLayout", v)}
          options={[
            { value: "split", label: "Split", hint: "Headline beside a portrait card. Uses the background + side image." },
            { value: "video", label: "Video", hint: "Full-bleed background video, headline centred. Uses the video URL." },
            { value: "showcase", label: "Showcase", hint: "Static background with a phone that live-previews your site." },
          ]}
        />
        <Loc base="pill" label="Pill" draft={draft} set={set} L={L} />
        <Loc base="title" label="Title" draft={draft} set={set} L={L} />
        <Loc base="titleAccent" label="Title accent (italic)" draft={draft} set={set} L={L} />
        <Loc base="subtitle" label="Subtitle" draft={draft} set={set} L={L} textarea />
        <Loc base="meta1" label="Meta line 1" draft={draft} set={set} L={L} />
        <Loc base="meta2" label="Meta line 2" draft={draft} set={set} L={L} />
        <ImagePicker label="Background image" preset="hero" value={String(draft.bgImage ?? "")} onChange={(v) => set("bgImage", v)} />
        <Slider label="Background image opacity" value={Number(draft.bgOpacity ?? 90)} onChange={(v) => set("bgOpacity", v)} />
        <Slider label="Dark overlay strength" value={Number(draft.overlayStrength ?? 35)} onChange={(v) => set("overlayStrength", v)} />
        <Field label="Background video URL (mp4/webm/YouTube/Vimeo): optional, overrides image" value={String(draft.bgVideo ?? "")} onChange={(v) => set("bgVideo", v)} />
        <ImagePicker label="Video poster image" preset="hero" value={String(draft.bgVideoPoster ?? "")} onChange={(v) => set("bgVideoPoster", v)} />
        <ImagePicker label="Side image" preset="product" value={String(draft.sideImage ?? "")} onChange={(v) => set("sideImage", v)} />
        <Loc base="sideRole" label="Side caption · role" draft={draft} set={set} L={L} />
        <Field label="Side caption · name" value={String(draft.sideName ?? "")} onChange={(v) => set("sideName", v)} />
      </>
    );
  }

  if (section === "info") {
    const items = (draft.items as Array<Record<string, string>>) ?? [];
    return (
      <Repeater
        items={items}
        onChange={(next) => set("items", next)}
        empty={{ label_en: "Label", value_en: "" }}
        L={L}
        fields={[
          { base: "label", label: "Label" },
          { base: "value", label: "Value" },
        ]}
      />
    );
  }

  if (section === "testimonials") {
    const items = (draft.items as Array<Record<string, string>>) ?? [];
    return (
      <>
        <Loc base="eyebrow" label="Label" draft={draft} set={set} L={L} />
        <Loc base="title" label="Title" draft={draft} set={set} L={L} />
        <SubHeading>Quotes</SubHeading>
        <Repeater
          items={items}
          onChange={(next) => set("items", next)}
          empty={{ quote_en: "", name: "", role_en: "" }}
          L={L}
          fields={[
            { base: "quote", label: "Quote", textarea: true },
            { key: "name", label: "Name" },
            { base: "role", label: "Role" },
          ]}
        />
      </>
    );
  }

  if (section === "cta") {
    return (
      <>
        <Loc base="eyebrow" label="Label" draft={draft} set={set} L={L} />
        <Loc base="title" label="Title" draft={draft} set={set} L={L} textarea />
        <Loc base="subtitle" label="Subtitle" draft={draft} set={set} L={L} textarea />
        <ImagePicker label="Background image" preset="hero" value={String(draft.bgImage ?? "")} onChange={(v) => set("bgImage", v)} />
      </>
    );
  }

  if (section === "services") {
    const items = (draft.items as Array<Record<string, string | number>>) ?? [];
    return (
      <>
        <Loc base="eyebrow" label="Label" draft={draft} set={set} L={L} />
        <Loc base="title" label="Title" draft={draft} set={set} L={L} />
        <SubHeading>Services list</SubHeading>
        <Repeater
          items={items}
          onChange={(next) => set("items", next)}
          empty={{ id: "new-svc", price: 10, duration: 30, name_en: "New service", desc_en: "" }}
          L={L}
          fields={[
            { base: "name", label: "Name" },
            { key: "price", label: "Price ($)" },
            { key: "duration", label: "Duration (min)" },
            { base: "desc", label: "Description", textarea: true },
            { key: "id", label: "Slug (id)" },
          ]}
        />
      </>
    );
  }

  if (section === "gallery_strip") {
    const images = (draft.images as Array<Record<string, string>>) ?? [];
    return (
      <>
        <Loc base="eyebrow" label="Label" draft={draft} set={set} L={L} />
        <Loc base="title" label="Title" draft={draft} set={set} L={L} />
        <SubHeading>Images</SubHeading>
        <Repeater
          items={images}
          onChange={(next) => set("images", next)}
          empty={{ src: "" }}
          L={L}
          fields={[{ key: "src", label: "Image", image: true }]}
        />
      </>
    );
  }

  if (section === "gallery") {
    const items = (draft.items as Array<Record<string, string | boolean>>) ?? [];
    return (
      <Repeater
        items={items}
        onChange={(next) => set("items", next)}
        empty={{ src: "", tag: "Shop", big: false }}
        L={L}
        fields={[
          { key: "src", label: "Image", image: true },
          { key: "tag", label: "Tag (Cuts / Beards / Shop)" },
          { key: "big", label: "Larger cell (true / false)" },
        ]}
      />
    );
  }

  if (section === "about") {
    return (
      <>
        <Loc base="eyebrow" label="Label" draft={draft} set={set} L={L} />
        <Loc base="title" label="Title" draft={draft} set={set} L={L} />
        <Loc base="p1" label="Paragraph 1" draft={draft} set={set} L={L} textarea />
        <Loc base="p2" label="Paragraph 2" draft={draft} set={set} L={L} textarea />
        <Loc base="p3" label="Paragraph 3" draft={draft} set={set} L={L} textarea />
        <ImagePicker label="Image" preset="product" value={String(draft.image ?? "")} onChange={(v) => set("image", v)} />
      </>
    );
  }

  if (section === "team") {
    const members = (draft.members as Array<Record<string, string>>) ?? [];
    return (
      <>
        <Loc base="eyebrow" label="Label" draft={draft} set={set} L={L} />
        <Loc base="title" label="Title" draft={draft} set={set} L={L} />
        <SubHeading>Members</SubHeading>
        <Repeater
          items={members}
          onChange={(next) => set("members", next)}
          empty={{ name_en: "Name", role_en: "Barber", years_en: "1 year", slug: "new", image: "" }}
          L={L}
          fields={[
            { base: "name", label: "Name" },
            { base: "role", label: "Role" },
            { base: "years", label: "Years in chair" },
            { key: "slug", label: "Slug (booking link)" },
            { key: "image", label: "Photo", image: true },
          ]}
        />
      </>
    );
  }

  if (section === "faq") {
    const items = (draft.items as Array<Record<string, string>>) ?? [];
    return (
      <>
        <Loc base="eyebrow" label="Label" draft={draft} set={set} L={L} />
        <Loc base="title" label="Title" draft={draft} set={set} L={L} />
        <SubHeading>Questions</SubHeading>
        <Repeater
          items={items}
          onChange={(next) => set("items", next)}
          empty={{ q_en: "", a_en: "" }}
          L={L}
          fields={[
            { base: "q", label: "Question" },
            { base: "a", label: "Answer", textarea: true },
          ]}
        />
      </>
    );
  }

  if (section === "contact") {
    const blocks = (draft.blocks as Array<Record<string, string>>) ?? [];
    return (
      <>
        <ImagePicker label="Image" preset="product" value={String(draft.image ?? "")} onChange={(v) => set("image", v)} />
        <SubHeading>Info blocks</SubHeading>
        <Repeater
          items={blocks}
          onChange={(next) => set("blocks", next)}
          empty={{ label_en: "Label", value_en: "" }}
          L={L}
          fields={[
            { base: "label", label: "Label" },
            { base: "value", label: "Value", textarea: true },
          ]}
        />
      </>
    );
  }

  if (section === "page_home") {
    return (
      <>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 16px" }}>
          Optional background image for the whole homepage. Shown behind
          every section with adjustable transparency.
        </p>
        <ImagePicker label="Background image" preset="hero" value={String(draft.bgImage ?? "")} onChange={(v) => set("bgImage", v)} />
        <Slider label="Opacity" value={Number(draft.bgOpacity ?? 12)} onChange={(v) => set("bgOpacity", v)} />
        <p style={{ fontSize: 12, color: "var(--muted-2)", margin: "6px 0 0" }}>
          Tip: keep it between 8–20% so the image doesn&apos;t fight with
          the text above it.
        </p>
      </>
    );
  }

  if (section.startsWith("page_")) {
    return (
      <>
        <Loc base="eyebrow" label="Label" draft={draft} set={set} L={L} />
        <Loc base="title" label="Title" draft={draft} set={set} L={L} textarea />
        <Loc base="sub" label="Subtitle" draft={draft} set={set} L={L} textarea />
      </>
    );
  }

  if (section.startsWith("seo_")) {
    return (
      <>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 16px" }}>
          These appear in Google, social shares, and the browser tab. Keep the
          title under 60 chars and the description 140–160 chars.
        </p>
        <Loc base="title" label="Page title" draft={draft} set={set} L={L} />
        <Loc base="description" label="Meta description" draft={draft} set={set} L={L} textarea />
        <ImagePicker label="Social share image (1200×630)" preset="og" value={String(draft.ogImage ?? "")} onChange={(v) => set("ogImage", v)} />
      </>
    );
  }

  if (section === "footer") {
    return (
      <>
        <Loc base="lede" label="Lede" draft={draft} set={set} L={L} textarea />
        <Loc base="cta" label="Big CTA" draft={draft} set={set} L={L} />
        <Loc base="copy" label="Copyright line" draft={draft} set={set} L={L} />
        <Loc base="tagline" label="Tagline" draft={draft} set={set} L={L} />
      </>
    );
  }

  return <p style={{ color: "var(--muted)" }}>No editor for &quot;{section}&quot; yet.</p>;
}

/* ====== schema-driven forms for the template skins (template2..5) ====== */

type FormRow = {
  /** Sub-heading divider. */
  h?: string;
  /** Localized text field, bound to `<loc>_<lang>`. */
  loc?: string;
  /** Image field (ImagePicker), bound to `img` directly. */
  img?: string;
  /** Plain (non-localized) text field, bound to `plain` directly. */
  plain?: string;
  /** Repeater bound to the array at `rep`. */
  rep?: string;
  label?: string;
  ta?: boolean;
  empty?: Record<string, unknown>;
  fields?: RepeaterField[];
};

/**
 * Every editable section of the non-default template skins (template2 nail
 * studio, template3 day spa, template4 aesthetics clinic, template5 yoga
 * studio). The sections themselves read these via useSection(); each form
 * here just exposes the same fields. Page headers (`page_*`) and SEO (`seo_*`)
 * reuse the generic forms above.
 */
const TEMPLATE_FORMS: Record<string, FormRow[]> = {
  /* ── template2 · Maison Lune (nail studio) ── */
  t2_hero: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title (line 1)" },
    { loc: "titleAccent", label: "Title accent (line 2, italic)" },
    { loc: "sub", label: "Subtitle", ta: true },
    { loc: "primaryCta", label: "Primary button" },
    { loc: "secondaryCta", label: "Secondary button" },
    { loc: "rating", label: "Rating line" },
    { loc: "note", label: "Note" },
    { img: "image", label: "Hero image" },
    { loc: "chipLabel", label: "Badge label" },
    { loc: "chipValue", label: "Badge value" },
  ],
  t2_marquee: [
    { rep: "items", empty: { label_en: "New phrase" }, fields: [{ base: "label", label: "Phrase" }] },
  ],
  t2_services: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "text", label: "Intro text", ta: true },
    { h: "Treatments" },
    {
      rep: "items",
      empty: { name_en: "New treatment", desc_en: "", price: 0, photo: "" },
      fields: [
        { base: "name", label: "Name" },
        { base: "desc", label: "Description", textarea: true },
        { key: "price", label: "Price (£)" },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t2_gallery: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { h: "Images" },
    {
      rep: "items",
      empty: { label_en: "New", photo: "" },
      fields: [
        { base: "label", label: "Caption" },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t2_artist: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "p1", label: "Paragraph 1", ta: true },
    { loc: "p2", label: "Paragraph 2", ta: true },
    { loc: "cta", label: "Button" },
    { img: "image", label: "Photo" },
    { loc: "statValue", label: "Stat value" },
    { loc: "statLabel", label: "Stat label" },
  ],
  t2_whyus: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { h: "Points" },
    {
      rep: "items",
      empty: { icon: "shield", title_en: "", desc_en: "" },
      fields: [
        { key: "icon", label: "Icon (shield / drop / clock / heart)" },
        { base: "title", label: "Title" },
        { base: "desc", label: "Description", textarea: true },
      ],
    },
  ],
  t2_testimonials: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { h: "Quotes" },
    {
      rep: "items",
      empty: { quote_en: "", name_en: "", detail_en: "" },
      fields: [
        { base: "quote", label: "Quote", textarea: true },
        { base: "name", label: "Name" },
        { base: "detail", label: "Detail" },
      ],
    },
  ],
  t2_cta: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "sub", label: "Subtitle", ta: true },
    { loc: "cta", label: "Button" },
  ],
  t2_about_story: [
    { loc: "title", label: "Title" },
    { loc: "p1", label: "Paragraph 1", ta: true },
    { loc: "p2", label: "Paragraph 2", ta: true },
    { img: "image", label: "Photo" },
  ],
  t2_about_values: [
    { h: "Values" },
    {
      rep: "items",
      empty: { title_en: "", desc_en: "" },
      fields: [
        { base: "title", label: "Title" },
        { base: "desc", label: "Description", textarea: true },
      ],
    },
  ],
  t2_shop: [
    { h: "Products" },
    {
      rep: "items",
      empty: { name_en: "New product", desc_en: "", price: 0, photo: "" },
      fields: [
        { base: "name", label: "Name" },
        { base: "desc", label: "Description", textarea: true },
        { key: "price", label: "Price (£)" },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t2_blog: [
    { h: "Posts" },
    {
      rep: "items",
      empty: { cat_en: "", date_en: "", title_en: "", excerpt_en: "", photo: "" },
      fields: [
        { base: "cat", label: "Category" },
        { base: "date", label: "Date" },
        { base: "title", label: "Title" },
        { base: "excerpt", label: "Excerpt", textarea: true },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t2_contact: [
    { h: "Details" },
    {
      rep: "details",
      empty: { label_en: "", value_en: "" },
      fields: [
        { base: "label", label: "Label" },
        { base: "value", label: "Value" },
      ],
    },
    { h: "Opening hours" },
    {
      rep: "hours",
      empty: { label_en: "", value_en: "" },
      fields: [
        { base: "label", label: "Day" },
        { base: "value", label: "Hours" },
      ],
    },
  ],

  /* ── template3 · Aurelia (day spa) ── */
  t3_hero: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "titleAccent", label: "Title accent (italic)" },
    { loc: "sub", label: "Subtitle", ta: true },
    { loc: "primaryCta", label: "Primary button" },
    { loc: "secondaryCta", label: "Secondary button" },
    { img: "image", label: "Hero image" },
    { loc: "chip1Label", label: "Badge 1 label" },
    { loc: "chip1Value", label: "Badge 1 value" },
    { loc: "chip2Label", label: "Badge 2 label" },
    { loc: "chip2Value", label: "Badge 2 value" },
  ],
  t3_stats: [
    { h: "Stats" },
    {
      rep: "items",
      empty: { value: "", label_en: "" },
      fields: [
        { key: "value", label: "Value" },
        { base: "label", label: "Label" },
      ],
    },
  ],
  t3_services: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "text", label: "Intro text", ta: true },
    { h: "Treatments" },
    {
      rep: "items",
      empty: { name_en: "New treatment", desc_en: "", mins: 60, price: 0, photo: "" },
      fields: [
        { base: "name", label: "Name" },
        { base: "desc", label: "Description", textarea: true },
        { key: "mins", label: "Minutes" },
        { key: "price", label: "Price (£)" },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t3_ritual: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { h: "Steps" },
    {
      rep: "items",
      empty: { title_en: "", desc_en: "" },
      fields: [
        { base: "title", label: "Title" },
        { base: "desc", label: "Description", textarea: true },
      ],
    },
  ],
  t3_gallery: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "text", label: "Intro text", ta: true },
    { h: "Images" },
    {
      rep: "items",
      empty: { label_en: "New", photo: "" },
      fields: [
        { base: "label", label: "Caption" },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t3_therapist: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "body", label: "Body", ta: true },
    { loc: "cta", label: "Button" },
    { img: "image", label: "Photo" },
  ],
  t3_whyus: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { h: "Points" },
    {
      rep: "items",
      empty: { icon: "leaf", title_en: "", desc_en: "" },
      fields: [
        { key: "icon", label: "Icon (leaf / shield / moon / clock)" },
        { base: "title", label: "Title" },
        { base: "desc", label: "Description", textarea: true },
      ],
    },
  ],
  t3_testimonial: [
    { loc: "quote", label: "Quote", ta: true },
    { loc: "name", label: "Name" },
    { loc: "detail", label: "Detail" },
  ],
  t3_cta: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "sub", label: "Subtitle", ta: true },
    { loc: "cta", label: "Button" },
  ],
  t3_about_story: [
    { loc: "title", label: "Title" },
    { loc: "p1", label: "Paragraph 1", ta: true },
    { loc: "p2", label: "Paragraph 2", ta: true },
    { img: "image", label: "Photo" },
  ],
  t3_about_values: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { h: "Values" },
    {
      rep: "items",
      empty: { title_en: "", desc_en: "" },
      fields: [
        { base: "title", label: "Title" },
        { base: "desc", label: "Description", textarea: true },
      ],
    },
  ],
  t3_shop: [
    { h: "Products" },
    {
      rep: "items",
      empty: { name_en: "New product", desc_en: "", price: 0, photo: "" },
      fields: [
        { base: "name", label: "Name" },
        { base: "desc", label: "Description", textarea: true },
        { key: "price", label: "Price (£)" },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t3_blog: [
    { h: "Posts" },
    {
      rep: "items",
      empty: { cat_en: "", date_en: "", title_en: "", excerpt_en: "", photo: "" },
      fields: [
        { base: "cat", label: "Category" },
        { base: "date", label: "Date" },
        { base: "title", label: "Title" },
        { base: "excerpt", label: "Excerpt", textarea: true },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t3_contact: [
    { h: "Details" },
    {
      rep: "details",
      empty: { label_en: "", value_en: "" },
      fields: [
        { base: "label", label: "Label" },
        { base: "value", label: "Value" },
      ],
    },
    { h: "Opening hours" },
    {
      rep: "hours",
      empty: { label_en: "", value_en: "" },
      fields: [
        { base: "label", label: "Day" },
        { base: "value", label: "Hours" },
      ],
    },
  ],

  /* ── template4 · Lumea (aesthetics clinic) ── */
  t4_hero: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "titleAccent", label: "Title accent (coloured)" },
    { loc: "sub", label: "Subtitle", ta: true },
    { loc: "primaryCta", label: "Primary button" },
    { loc: "secondaryCta", label: "Secondary button" },
    { loc: "trust1", label: "Trust point 1" },
    { loc: "trust2", label: "Trust point 2" },
    { loc: "trust3", label: "Trust point 3" },
    { img: "image", label: "Hero image" },
    { loc: "cardLabel", label: "Card label" },
    { loc: "cardValue", label: "Card value" },
  ],
  t4_stats: [
    { h: "Credentials" },
    {
      rep: "items",
      empty: { value: "", label_en: "" },
      fields: [
        { key: "value", label: "Value" },
        { base: "label", label: "Label" },
      ],
    },
  ],
  t4_treatments: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "text", label: "Intro text", ta: true },
    { h: "Treatments" },
    {
      rep: "items",
      empty: { name_en: "New treatment", desc_en: "", cat_en: "Skin", price: 0, photo: "" },
      fields: [
        { base: "name", label: "Name" },
        { base: "desc", label: "Description", textarea: true },
        { base: "cat", label: "Category" },
        { key: "price", label: "Price (£)" },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t4_process: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { h: "Steps" },
    {
      rep: "items",
      empty: { title_en: "", desc_en: "" },
      fields: [
        { base: "title", label: "Title" },
        { base: "desc", label: "Description", textarea: true },
      ],
    },
  ],
  t4_gallery: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "text", label: "Intro text", ta: true },
    { h: "Images" },
    {
      rep: "items",
      empty: { label_en: "New", photo: "" },
      fields: [
        { base: "label", label: "Caption" },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t4_practitioner: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "p1", label: "Paragraph 1", ta: true },
    { loc: "p2", label: "Paragraph 2", ta: true },
    { loc: "cta", label: "Button" },
    { img: "image", label: "Photo" },
    { h: "Credentials" },
    {
      rep: "credentials",
      empty: { label_en: "" },
      fields: [{ base: "label", label: "Credential" }],
    },
  ],
  t4_whyus: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { h: "Points" },
    {
      rep: "items",
      empty: { title_en: "", desc_en: "" },
      fields: [
        { base: "title", label: "Title" },
        { base: "desc", label: "Description", textarea: true },
      ],
    },
  ],
  t4_faq: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { h: "Questions" },
    {
      rep: "items",
      empty: { q_en: "", a_en: "" },
      fields: [
        { base: "q", label: "Question" },
        { base: "a", label: "Answer", textarea: true },
      ],
    },
  ],
  t4_testimonial: [
    { loc: "quote", label: "Quote", ta: true },
    { loc: "name", label: "Name" },
    { loc: "detail", label: "Detail" },
  ],
  t4_cta: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "sub", label: "Subtitle", ta: true },
    { loc: "cta", label: "Button" },
  ],
  t4_about_story: [
    { loc: "title", label: "Title" },
    { loc: "p1", label: "Paragraph 1", ta: true },
    { loc: "p2", label: "Paragraph 2", ta: true },
    { img: "image", label: "Photo" },
  ],
  t4_about_values: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { h: "Values" },
    {
      rep: "items",
      empty: { title_en: "", desc_en: "" },
      fields: [
        { base: "title", label: "Title" },
        { base: "desc", label: "Description", textarea: true },
      ],
    },
  ],
  t4_shop: [
    { h: "Products" },
    {
      rep: "items",
      empty: { name_en: "New product", desc_en: "", price: 0, photo: "" },
      fields: [
        { base: "name", label: "Name" },
        { base: "desc", label: "Description", textarea: true },
        { key: "price", label: "Price (£)" },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t4_blog: [
    { h: "Posts" },
    {
      rep: "items",
      empty: { cat_en: "", date_en: "", title_en: "", excerpt_en: "", photo: "" },
      fields: [
        { base: "cat", label: "Category" },
        { base: "date", label: "Date" },
        { base: "title", label: "Title" },
        { base: "excerpt", label: "Excerpt", textarea: true },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t4_contact: [
    { h: "Details" },
    {
      rep: "details",
      empty: { label_en: "", value_en: "" },
      fields: [
        { base: "label", label: "Label" },
        { base: "value", label: "Value" },
      ],
    },
    { h: "Opening hours" },
    {
      rep: "hours",
      empty: { label_en: "", value_en: "" },
      fields: [
        { base: "label", label: "Day" },
        { base: "value", label: "Hours" },
      ],
    },
  ],

  /* ── template5 · Marigold (yoga studio) ── */
  t5_hero: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title (line 1)" },
    { loc: "titleAccent", label: "Title accent (highlighted, italic)" },
    { loc: "titleEnd", label: "Title (line 3)" },
    { loc: "sub", label: "Subtitle", ta: true },
    { loc: "primaryCta", label: "Primary button" },
    { loc: "secondaryCta", label: "Secondary button" },
    { loc: "note", label: "Note line" },
    { loc: "badge", label: "Sticker badge" },
    { loc: "sticker", label: "Second sticker" },
    { img: "image1", label: "Hero photo 1" },
    { img: "image2", label: "Hero photo 2" },
    { img: "image3", label: "Hero photo 3" },
  ],
  t5_marquee: [
    { rep: "items", empty: { label_en: "New phrase" }, fields: [{ base: "label", label: "Phrase" }] },
  ],
  t5_stats: [
    { h: "Numbers" },
    {
      rep: "items",
      empty: { value: "", label_en: "" },
      fields: [
        { key: "value", label: "Value" },
        { base: "label", label: "Label" },
      ],
    },
  ],
  t5_classes: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "text", label: "Intro text", ta: true },
    { h: "Classes" },
    {
      rep: "items",
      empty: { name_en: "New class", desc_en: "", level_en: "All levels", price: 0, photo: "" },
      fields: [
        { base: "name", label: "Name" },
        { base: "desc", label: "Description", textarea: true },
        { base: "level", label: "Level" },
        { key: "price", label: "Price (£)" },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t5_schedule: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { h: "Steps" },
    {
      rep: "items",
      empty: { title_en: "", desc_en: "" },
      fields: [
        { base: "title", label: "Title" },
        { base: "desc", label: "Description", textarea: true },
      ],
    },
  ],
  t5_gallery: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "text", label: "Intro text", ta: true },
    { h: "Images" },
    {
      rep: "items",
      empty: { label_en: "New", photo: "" },
      fields: [
        { base: "label", label: "Caption" },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t5_teacher: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { loc: "p1", label: "Paragraph 1", ta: true },
    { loc: "p2", label: "Paragraph 2", ta: true },
    { loc: "cta", label: "Button" },
    { img: "image", label: "Photo" },
    { h: "Credentials" },
    {
      rep: "credentials",
      empty: { label_en: "" },
      fields: [{ base: "label", label: "Credential" }],
    },
  ],
  t5_whyus: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { h: "Points" },
    {
      rep: "items",
      empty: { title_en: "", desc_en: "" },
      fields: [
        { base: "title", label: "Title" },
        { base: "desc", label: "Description", textarea: true },
      ],
    },
  ],
  t5_faq: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { h: "Questions" },
    {
      rep: "items",
      empty: { q_en: "", a_en: "" },
      fields: [
        { base: "q", label: "Question" },
        { base: "a", label: "Answer", textarea: true },
      ],
    },
  ],
  t5_testimonial: [
    { loc: "quote", label: "Quote", ta: true },
    { loc: "name", label: "Name" },
    { loc: "detail", label: "Detail" },
  ],
  t5_cta: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title (line 1)" },
    { loc: "titleAccent", label: "Title accent (highlighted)" },
    { loc: "titleEnd", label: "Title (line 3)" },
    { loc: "sub", label: "Subtitle", ta: true },
    { loc: "cta", label: "Button" },
  ],
  t5_about_story: [
    { loc: "title", label: "Title" },
    { loc: "p1", label: "Paragraph 1", ta: true },
    { loc: "p2", label: "Paragraph 2", ta: true },
    { img: "image", label: "Photo" },
  ],
  t5_about_values: [
    { loc: "eyebrow", label: "Eyebrow" },
    { loc: "title", label: "Title" },
    { h: "Values" },
    {
      rep: "items",
      empty: { title_en: "", desc_en: "" },
      fields: [
        { base: "title", label: "Title" },
        { base: "desc", label: "Description", textarea: true },
      ],
    },
  ],
  t5_shop: [
    { h: "Products" },
    {
      rep: "items",
      empty: { name_en: "New product", desc_en: "", price: 0, photo: "" },
      fields: [
        { base: "name", label: "Name" },
        { base: "desc", label: "Description", textarea: true },
        { key: "price", label: "Price (£)" },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t5_blog: [
    { h: "Posts" },
    {
      rep: "items",
      empty: { cat_en: "", date_en: "", title_en: "", excerpt_en: "", photo: "" },
      fields: [
        { base: "cat", label: "Category" },
        { base: "date", label: "Date" },
        { base: "title", label: "Title" },
        { base: "excerpt", label: "Excerpt", textarea: true },
        { key: "photo", label: "Photo", image: true },
      ],
    },
  ],
  t5_contact: [
    { h: "Details" },
    {
      rep: "details",
      empty: { label_en: "", value_en: "" },
      fields: [
        { base: "label", label: "Label" },
        { base: "value", label: "Value" },
      ],
    },
    { h: "Opening hours" },
    {
      rep: "hours",
      empty: { label_en: "", value_en: "" },
      fields: [
        { base: "label", label: "Day" },
        { base: "value", label: "Hours" },
      ],
    },
  ],
};

function renderSchema(
  rows: FormRow[],
  draft: Record<string, unknown>,
  set: SetFn,
  L: Lang
) {
  return (
    <>
      {rows.map((row, i) => {
        if (row.h) return <SubHeading key={i}>{row.h}</SubHeading>;
        if (row.loc)
          return (
            <Loc key={i} base={row.loc} label={row.label ?? ""} draft={draft} set={set} L={L} textarea={row.ta} />
          );
        if (row.img)
          return (
            <ImagePicker
              key={i}
              label={row.label ?? ""}
              preset="gallery"
              value={String(draft[row.img] ?? "")}
              onChange={(v) => set(row.img!, v)}
            />
          );
        if (row.plain)
          return (
            <Field
              key={i}
              label={row.label ?? ""}
              value={String(draft[row.plain] ?? "")}
              onChange={(v) => set(row.plain!, v)}
              textarea={row.ta}
            />
          );
        if (row.rep) {
          const items = (draft[row.rep] as Array<Record<string, unknown>>) ?? [];
          return (
            <Repeater
              key={i}
              items={items}
              onChange={(next) => set(row.rep!, next)}
              empty={row.empty ?? {}}
              L={L}
              fields={row.fields ?? []}
            />
          );
        }
        return null;
      })}
    </>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 style={{ margin: "20px 0 8px", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--muted-2)" }}>
      {children}
    </h4>
  );
}

/**
 * One localized field, bound to `<base>_<editLang>`. When editing a non-English
 * language, the English value shows as a placeholder to guide the translation.
 */
function Loc({
  base, label, draft, set, L, textarea,
}: {
  base: string; label: string; draft: Record<string, unknown>;
  set: SetFn; L: Lang; textarea?: boolean;
}) {
  const key = `${base}_${L}`;
  const enValue = String(draft[`${base}_en`] ?? "");
  return (
    <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
      <p style={{ margin: "0 0 6px", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)" }}>{label}</p>
      <Field
        label={LANG_NAMES[L]}
        value={String(draft[key] ?? "")}
        onChange={(v) => set(key, v)}
        textarea={textarea}
        placeholder={L !== "en" ? enValue : undefined}
      />
    </div>
  );
}

/**
 * A segmented picker for a small fixed set of options (used by the hero to
 * switch between its three layouts). Shows the selected option's hint below.
 */
function LayoutPicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; hint: string }[];
}) {
  const active = options.find((o) => o.value === value) ?? options[0];
  return (
    <div style={{ margin: "8px 0 4px" }}>
      <div style={{ display: "flex", gap: 6 }}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              flex: 1,
              padding: "9px 4px",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              border: `1px solid ${o.value === active.value ? "var(--gold)" : "var(--border-strong)"}`,
              background: o.value === active.value ? "color-mix(in srgb, var(--gold) 14%, transparent)" : "var(--surface)",
              color: o.value === active.value ? "var(--gold)" : "var(--foreground)",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 11, lineHeight: 1.5, color: "var(--muted-2)" }}>
        {active.hint}
      </p>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div style={{ margin: "12px 0" }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--muted-2)",
          marginBottom: 6,
        }}
      >
        {label}: {value}%
      </label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--gold)" }}
      />
    </div>
  );
}

function Field({
  label, value, onChange, textarea, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  textarea?: boolean; placeholder?: string;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid var(--border-strong)",
    background: "var(--surface)",
    color: "var(--foreground)",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  };
  return (
    <label style={{ display: "block", margin: "8px 0" }}>
      <span style={{ display: "block", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted-2)", marginBottom: 4 }}>{label}</span>
      {textarea ? (
        <textarea rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, resize: "vertical", minHeight: 70 }} />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
      )}
    </label>
  );
}

type RepeaterField = {
  /** Localized field: edits `<base>_<editLang>`. */
  base?: string;
  /** Plain field: edits `key` directly (images, prices, ids). */
  key?: string;
  label: string;
  textarea?: boolean;
  image?: boolean;
};

function Repeater<T extends Record<string, unknown>>({
  items, onChange, empty, fields, L,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  empty: T;
  fields: RepeaterField[];
  L: Lang;
}) {
  function update(i: number, key: string, v: unknown) {
    const next = items.slice();
    next[i] = { ...next[i], [key]: v } as T;
    onChange(next);
  }
  function remove(i: number) {
    const next = items.slice();
    next.splice(i, 1);
    onChange(next);
  }
  function add() {
    onChange([...items, { ...empty }]);
  }
  return (
    <>
      {items.map((it, i) => (
        <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, marginBottom: 10, background: "var(--surface)" }}>
          <p style={{ margin: "0 0 6px", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted-2)" }}>Item #{i + 1}</p>
          {fields.map((f) => {
            const fieldKey = f.base ? `${f.base}_${L}` : f.key!;
            const labelText = f.base && L !== "en" ? `${f.label} (${LANG_NAMES[L]})` : f.label;
            if (f.image) {
              return (
                <ImagePicker
                  key={fieldKey}
                  label={f.label}
                  preset="gallery"
                  value={String(it[fieldKey] ?? "")}
                  onChange={(v) => update(i, fieldKey, v)}
                />
              );
            }
            return (
              <Field
                key={fieldKey}
                label={labelText}
                value={String(it[fieldKey] ?? "")}
                onChange={(v) => update(i, fieldKey, v)}
                textarea={f.textarea}
                placeholder={f.base && L !== "en" ? String(it[`${f.base}_en`] ?? "") : undefined}
              />
            );
          })}
          <button
            onClick={() => remove(i)}
            style={{
              marginTop: 4,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(239,68,68,0.4)",
              background: "rgba(239,68,68,0.1)",
              color: "#fca5a5",
              fontSize: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        onClick={add}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 10,
          border: "1px dashed rgba(201,169,97,0.5)",
          background: "rgba(201,169,97,0.1)",
          color: "var(--gold)",
          fontSize: 11,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        + Add item
      </button>
    </>
  );
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SUPPORTED_LANGS, type Lang } from "./langs";

type Content = Record<string, Record<string, unknown>>;

type Ctx = {
  /** Persisted content (server truth). */
  content: Content;
  /** Unsaved edits, layered over `content` for a live page preview. */
  preview: Content;
  isAdmin: boolean;
  /** Currently open editor section (or null). */
  editing: string | null;
  openEditor: (section: string) => void;
  closeEditor: () => void;
  /** Merge fields into a section's live preview. Not persisted. */
  setPreview: (section: string, fields: Record<string, unknown>) => void;
  /** Persist every previewed section, fold into content, clear the preview. */
  commitPreview: () => Promise<boolean>;
  /** Drop all unsaved edits. */
  discardPreview: () => void;
  /** A section reports its default fields, so the editor can open pre-filled
   *  even when nothing is persisted yet (a fresh install / template demo). */
  registerDefaults: (section: string, defaults: Record<string, unknown>) => void;
  /** The registered defaults for a section, if its component has rendered. */
  getDefaults: (section: string) => Record<string, unknown> | undefined;
};

const Ctx = createContext<Ctx | null>(null);

/**
 * Any content field ending in a supported language code is a translatable
 * variant, e.g. `title_en`, `title_de`. The part before the suffix is its
 * "base"; resolveLang() collapses every base to the active language.
 */
const LANG_SUFFIX = new RegExp(`_(${SUPPORTED_LANGS.join("|")})$`);

/**
 * Collapse multilingual content to one language.
 *
 * Section components were written when the template was bilingual: they read
 * `field_en` / `field_el` and call `pick(en, el)`. To stay multilingual
 * without rewriting all of them, every `<base>_<lang>` field is resolved to
 * the active language (falling back to `_en`) and written into BOTH the `_en`
 * and `_el` slots, so `pick()` returns the right value whatever the language.
 *
 * Recurses into arrays so repeated items (services, team, FAQ, ...) translate
 * too. Returns fresh objects; never mutates stored state.
 */
function resolveLang(value: unknown, lang: Lang): unknown {
  if (Array.isArray(value)) return value.map((v) => resolveLang(v, lang));
  if (!value || typeof value !== "object") return value;

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v && typeof v === "object" ? resolveLang(v, lang) : v;
  }

  const bases = new Set<string>();
  for (const k of Object.keys(out)) {
    const m = k.match(LANG_SUFFIX);
    if (m) bases.add(k.slice(0, -m[0].length));
  }
  for (const base of bases) {
    const resolved = out[`${base}_${lang}`] ?? out[`${base}_en`];
    out[`${base}_en`] = resolved;
    out[`${base}_el`] = resolved;
  }
  return out;
}

export function EditorProvider({
  initialContent,
  children,
}: {
  initialContent: Content;
  children: ReactNode;
}) {
  const [content, setContent] = useState<Content>(initialContent);
  const [preview, setPreviewState] = useState<Content>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  // Section defaults, collected as each section renders (see useSection). A
  // ref, not state: the editor reads it once on open, no re-render needed.
  const defaultsRef = useRef<Content>({});

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(!!d.admin))
      .catch(() => {});
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      content,
      preview,
      isAdmin,
      editing,
      openEditor: (s) => setEditing(s),
      closeEditor: () => setEditing(null),
      registerDefaults: (section, defaults) => {
        // Merge: a section split across two components (e.g. a heading wrapper
        // + a reusable list) each report their own fields.
        defaultsRef.current[section] = {
          ...defaultsRef.current[section],
          ...(defaults as Record<string, unknown>),
        };
      },
      getDefaults: (section) => defaultsRef.current[section],
      setPreview: (section, fields) =>
        setPreviewState((p) => ({
          ...p,
          [section]: { ...(p[section] ?? {}), ...fields },
        })),
      discardPreview: () => setPreviewState({}),
      commitPreview: async () => {
        const sections = Object.entries(preview).filter(
          ([, fields]) => fields && Object.keys(fields).length > 0,
        );
        try {
          for (const [section, fields] of sections) {
            const res = await fetch("/api/content", {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ section, patch: fields }),
            });
            if (!res.ok) return false;
          }
        } catch {
          return false;
        }
        setContent((c) => {
          const next = { ...c };
          for (const [section, fields] of sections) {
            next[section] = { ...(next[section] ?? {}), ...fields };
          }
          return next;
        });
        setPreviewState({});
        return true;
      },
    }),
    [content, preview, isAdmin, editing],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEditor(): Ctx {
  const c = useContext(Ctx);
  if (!c) {
    return {
      content: {},
      preview: {},
      isAdmin: false,
      editing: null,
      openEditor: () => {},
      closeEditor: () => {},
      setPreview: () => {},
      commitPreview: async () => false,
      discardPreview: () => {},
      registerDefaults: () => {},
      getDefaults: () => undefined,
    };
  }
  return c;
}

/**
 * Active language, read from `<html lang>` — which the LangProvider keeps in
 * sync with the current language. Used instead of importing the i18n module
 * here so editorClient stays a lightweight dependency for every section.
 */
function useDocLang(): Lang {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const el = document.documentElement;
    const read = () => {
      const v = el.lang as Lang;
      setLang(SUPPORTED_LANGS.includes(v) ? v : "en");
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: ["lang"] });
    return () => obs.disconnect();
  }, []);
  return lang;
}

/**
 * Read a section's fields with a default fallback, resolved to the active
 * language. Unsaved editor edits (`preview`) layer over persisted `content`,
 * so changes show on the page live, before Save.
 */
export function useSection<T extends Record<string, unknown>>(
  section: string,
  defaults: T,
): T {
  const { content, preview, registerDefaults } = useEditor();
  const lang = useDocLang();
  // Report this section's defaults once, so the editor panel can open
  // pre-filled with the current copy instead of blank fields.
  useEffect(() => {
    registerDefaults(section, defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);
  const live = {
    ...(content[section] ?? {}),
    ...(preview[section] ?? {}),
  };
  const merged = { ...defaults, ...live };
  return resolveLang(merged, lang) as T;
}

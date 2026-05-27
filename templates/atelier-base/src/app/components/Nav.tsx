"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useLang, LANG_NAMES, type Lang } from "../../lib/i18n";
import { langPick } from "../../lib/langs";
import { useTheme } from "../../lib/theme";
import { useEditor } from "../../lib/editorClient";
import { useCart } from "../../lib/cartClient";
import { useBranding } from "../../lib/brandingClient";
import { useNavSettings } from "../../lib/navClient";
import { withBasePath, tenantRelativePath } from "../../lib/basePath";
import InstallAppButton from "./InstallAppButton";

const MOBILE_MENU_ID = "nav-mobile-menu";

export default function Nav({ demoBannerOn = false }: { demoBannerOn?: boolean } = {}) {
  // usePathname() carries the /<slug> prefix on the client but not on the
  // server (server.js strips it before the demo renders). Compare against the
  // tenant-relative path so the active-link state is identical on both sides
  // and does not trigger a hydration mismatch.
  const pathname = tenantRelativePath(usePathname());
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { lang, setLang, enabled } = useLang();
  const { theme, toggle } = useTheme();
  const { isAdmin } = useEditor();
  const { count: cartCount } = useCart();
  const { branding } = useBranding();
  const { nav } = useNavSettings();
  const shouldReduceMotion = useReducedMotion();
  const tagline = lang === "el" ? branding.tagline_el : branding.tagline_en;

  const links = nav.links
    .filter((l) => l.enabled !== false)
    .map((l) => ({
      href: l.href,
      label: l[`label_${lang}`] || l.label_en,
    }));
  const bookLabel = nav[`bookLabel_${lang}`] || nav.bookLabel_en || "Book";
  const bookHref = nav.bookHref || "/book";

  const toggleMenuLabel = open
    ? langPick({ en: "Close menu", el: "Κλείσιμο μενού", de: "Menü schließen", fr: "Fermer le menu", it: "Chiudi il menu", es: "Cerrar menú", nl: "Menu sluiten", pl: "Zamknij menu", pt: "Fechar menu", sv: "Stäng menyn", sq: "Mbyll menynë" }, lang)
    : langPick({ en: "Open menu", el: "Άνοιγμα μενού", de: "Menü öffnen", fr: "Ouvrir le menu", it: "Apri il menu", es: "Abrir menú", nl: "Menu openen", pl: "Otwórz menu", pt: "Abrir menu", sv: "Öppna menyn", sq: "Hap menynë" }, lang);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  // Close mobile menu on ESC
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/setup")) return null;

  return (
    <motion.header
      initial={shouldReduceMotion ? false : { y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 z-50 transition-all duration-300 ${
        demoBannerOn ? "top-[46px]" : "top-0"
      } ${scrolled ? "backdrop-blur-xl" : ""}`}
      style={{
        background: scrolled ? "var(--nav-bg)" : "transparent",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
      }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 md:py-5" aria-label={langPick({ en: "Main navigation", el: "Κύρια πλοήγηση", de: "Hauptnavigation", fr: "Navigation principale", it: "Navigazione principale", es: "Navegación principal", nl: "Hoofdnavigatie", pl: "Nawigacja główna", pt: "Navegação principal", sv: "Huvudnavigering", sq: "Navigimi kryesor" }, lang)}>
        <Link href="/" className="group flex items-center gap-2.5">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={withBasePath(theme === "light" && branding.logoUrlDark ? branding.logoUrlDark : branding.logoUrl)}
              alt={branding.wordmark || "Logo"}
              width={144}
              height={36}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-9 w-auto object-contain"
            />
          ) : (
            <div className="leading-none">
              <span
                className="block font-serif text-xl font-semibold tracking-wider"
                style={{ color: "var(--foreground)" }}
              >
                {branding.wordmark || "YOUR SALON"}
              </span>
              {tagline && (
                <span
                  className="hidden text-[10px] uppercase tracking-[0.3em] sm:block"
                  style={{ color: "var(--gold)" }}
                >
                  {tagline}
                </span>
              )}
            </div>
          )}
        </Link>

        <ul className="hidden items-center gap-0.5 md:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative whitespace-nowrap px-2.5 py-2 text-[13px] uppercase transition-colors hover:opacity-100 lg:px-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] rounded ${
                    lang === "el" ? "tracking-[0.12em]" : "tracking-[0.18em]"
                  }`}
                  style={{
                    color: active ? "var(--foreground)" : "var(--muted)",
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-full"
                      style={{ background: "var(--surface-strong)" }}
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 400, damping: 30 }
                      }
                    />
                  )}
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={toggle}
            data-theme-toggle="1"
            aria-label={langPick({ en: "Toggle dark / light theme", el: "Εναλλαγή σκοτεινής / φωτεινής εμφάνισης", de: "Zwischen hellem und dunklem Design wechseln", fr: "Basculer le thème clair / sombre", it: "Cambia tema chiaro / scuro", es: "Cambiar tema claro / oscuro", nl: "Wissel tussen licht / donker thema", pl: "Przełącz motyw jasny / ciemny", pt: "Alternar tema claro / escuro", sv: "Växla mörkt / ljust tema", sq: "Ndrysho temën e ndritshme / të errët" }, lang)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
            style={{
              borderColor: "var(--border-strong)",
              background: "var(--surface)",
              color: "var(--foreground)",
            }}
          >
            {theme === "dark" ? (
              <SunIcon />
            ) : (
              <MoonIcon />
            )}
          </button>

          <LangSelector />
          <Link
            href="/cart"
            aria-label={langPick({ en: "Shopping cart", el: "Καλάθι αγορών", de: "Warenkorb", fr: "Panier", it: "Carrello", es: "Carrito de compras", nl: "Winkelwagen", pl: "Koszyk", pt: "Carrinho de compras", sv: "Kundvagn", sq: "Shporta e blerjeve" }, lang)}
            title={langPick({ en: "Cart", el: "Καλάθι", de: "Warenkorb", fr: "Panier", it: "Carrello", es: "Carrito", nl: "Winkelwagen", pl: "Koszyk", pt: "Carrinho", sv: "Kundvagn", sq: "Shporta" }, lang)}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
            style={{
              borderColor: "var(--border-strong)",
              background: "var(--surface)",
              color: "var(--foreground)",
            }}
          >
            <CartIcon />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  borderRadius: 999,
                  background: "var(--gold)",
                  color: "#000",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {cartCount}
              </span>
            )}
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              aria-label={langPick({ en: "Admin dashboard", el: "Πίνακας διαχείρισης", de: "Admin-Dashboard", fr: "Tableau de bord admin", it: "Pannello di amministrazione", es: "Panel de administración", nl: "Beheerdersdashboard", pl: "Panel administratora", pt: "Painel de administração", sv: "Adminpanel", sq: "Paneli i administrimit" }, lang)}
              title={langPick({ en: "Admin dashboard", el: "Διαχείριση", de: "Admin-Dashboard", fr: "Tableau de bord admin", it: "Pannello di amministrazione", es: "Panel de administración", nl: "Beheerdersdashboard", pl: "Panel administratora", pt: "Painel de administração", sv: "Adminpanel", sq: "Paneli i administrimit" }, lang)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
              style={{
                borderColor: "var(--gold)",
                background: "var(--surface)",
                color: "var(--gold)",
              }}
            >
              <AdminIcon />
            </Link>
          )}
          <Link
            href={bookHref}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold uppercase text-black transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] ${
              lang === "el" ? "tracking-[0.12em]" : "tracking-widest"
            }`}
            style={{ background: "var(--gold)" }}
          >
            {bookLabel}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/cart"
            aria-label={langPick({ en: "Shopping cart", el: "Καλάθι αγορών", de: "Warenkorb", fr: "Panier", it: "Carrello", es: "Carrito de compras", nl: "Winkelwagen", pl: "Koszyk", pt: "Carrinho de compras", sv: "Kundvagn", sq: "Shporta e blerjeve" }, lang)}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
            style={{
              borderColor: "var(--border-strong)",
              background: "var(--surface)",
              color: "var(--foreground)",
            }}
          >
            <CartIcon />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  borderRadius: 999,
                  background: "var(--gold)",
                  color: "#000",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {cartCount}
              </span>
            )}
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              aria-label={langPick({ en: "Admin", el: "Διαχείριση", de: "Admin", fr: "Admin", it: "Admin", es: "Admin", nl: "Beheer", pl: "Admin", pt: "Admin", sv: "Admin", sq: "Admin" }, lang)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
              style={{
                borderColor: "var(--gold)",
                background: "var(--surface)",
                color: "var(--gold)",
              }}
            >
              <AdminIcon />
            </Link>
          )}
          <button
            onClick={toggle}
            data-theme-toggle="1"
            aria-label={langPick({ en: "Toggle dark / light theme", el: "Εναλλαγή εμφάνισης", de: "Design wechseln", fr: "Changer de thème", it: "Cambia tema", es: "Cambiar tema", nl: "Thema wisselen", pl: "Zmień motyw", pt: "Mudar tema", sv: "Byt tema", sq: "Ndrysho temën" }, lang)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
            style={{
              borderColor: "var(--border-strong)",
              background: "var(--surface)",
              color: "var(--foreground)",
            }}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={toggleMenuLabel}
            aria-expanded={open}
            aria-controls={MOBILE_MENU_ID}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
            style={{ borderColor: "var(--border-strong)" }}
          >
            <motion.span
              animate={shouldReduceMotion ? {} : { rotate: open ? 45 : 0, y: open ? 0 : -3 }}
              className="absolute h-px w-5"
              style={{ background: "var(--foreground)", transform: open && shouldReduceMotion ? "rotate(45deg)" : undefined }}
            />
            <motion.span
              animate={shouldReduceMotion ? {} : { rotate: open ? -45 : 0, y: open ? 0 : 3 }}
              className="absolute h-px w-5"
              style={{ background: "var(--foreground)", transform: open && shouldReduceMotion ? "rotate(-45deg)" : undefined }}
            />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id={MOBILE_MENU_ID}
            initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={shouldReduceMotion ? {} : { height: 0, opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
            className="overflow-hidden border-t md:hidden"
            style={{
              borderColor: "var(--border)",
              background: "var(--nav-bg)",
            }}
          >
            <ul className="flex flex-col p-4">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={pathname === l.href ? "page" : undefined}
                    className={`block rounded-lg px-4 py-3 text-sm uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] ${
                      lang === "el" ? "tracking-[0.14em]" : "tracking-widest"
                    }`}
                    style={{
                      background:
                        pathname === l.href
                          ? "var(--surface-strong)"
                          : "transparent",
                      color:
                        pathname === l.href
                          ? "var(--foreground)"
                          : "var(--muted)",
                    }}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="mt-2 flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-widest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
                  style={{
                    borderColor: "var(--gold)",
                    color: "var(--gold)",
                  }}
                >
                  <AdminIcon /> {langPick({ en: "Admin", el: "Διαχείριση", de: "Admin", fr: "Admin", it: "Admin", es: "Admin", nl: "Beheer", pl: "Admin", pt: "Admin", sv: "Admin", sq: "Admin" }, lang)}
                </Link>
              )}
              <Link
                href={bookHref}
                className="mt-2 block rounded-full px-5 py-3 text-center text-sm font-semibold uppercase tracking-widest text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
                style={{ background: "var(--gold)" }}
              >
                {bookLabel}
              </Link>
              <li className="mt-2 list-none">
                <InstallAppButton className="block w-full rounded-lg border border-[var(--border)] px-4 py-3 text-center text-sm uppercase tracking-widest text-[var(--muted)] transition-colors hover:bg-[var(--surface-strong)]" />
              </li>
              {enabled.length > 1 && (
                <div
                  className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs uppercase tracking-[0.2em]"
                  style={{ color: "var(--muted-2)" }}
                >
                  {enabled.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      aria-label={LANG_NAMES[l]}
                      aria-pressed={l === lang}
                      className={l === lang ? "font-semibold" : ""}
                      style={{
                        color: l === lang ? "var(--gold)" : "inherit",
                        minWidth: 44,
                        minHeight: 44,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {LANG_NAMES[l]}
                    </button>
                  ))}
                </div>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

/**
 * Language selector. Shows only the languages the shop owner enabled
 * (settings.json `enabledLanguages`). When English is the only enabled
 * language there is nothing to switch, so the selector renders nothing.
 */
function LangSelector() {
  const { lang, setLang, enabled } = useLang();
  const [open, setOpen] = useState(false);
  const dropdownId = "lang-dropdown";
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (enabled.length <= 1) return null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={langPick({ en: "Change language", el: "Επιλογή γλώσσας", de: "Sprache ändern", fr: "Changer de langue", it: "Cambia lingua", es: "Cambiar idioma", nl: "Taal wijzigen", pl: "Zmień język", pt: "Mudar idioma", sv: "Byt språk", sq: "Ndrysho gjuhën" }, lang)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={dropdownId}
        className="inline-flex h-9 items-center gap-1 rounded-full border px-3 text-[11px] uppercase tracking-[0.2em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
        style={{
          borderColor: "var(--border-strong)",
          background: "var(--surface)",
          color: "var(--foreground)",
        }}
      >
        {lang}
        <span style={{ fontSize: 8, opacity: 0.6 }} aria-hidden="true">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <ul
            id={dropdownId}
            role="listbox"
            aria-label={langPick({ en: "Select language", el: "Επιλογή γλώσσας", de: "Sprache auswählen", fr: "Sélectionner la langue", it: "Seleziona lingua", es: "Seleccionar idioma", nl: "Taal selecteren", pl: "Wybierz język", pt: "Selecionar idioma", sv: "Välj språk", sq: "Zgjidh gjuhën" }, lang)}
            className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border py-1 shadow-xl"
            style={{ borderColor: "var(--border-strong)", background: "var(--nav-bg)" }}
          >
            {enabled.map((l: Lang) => (
              <li key={l} role="option" aria-selected={l === lang}>
                <button
                  onClick={() => {
                    setLang(l);
                    setOpen(false);
                    buttonRef.current?.focus();
                  }}
                  className="block w-full px-4 py-2 text-left text-xs transition-colors hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
                  style={{ color: l === lang ? "var(--gold)" : "var(--muted)" }}
                >
                  {LANG_NAMES[l]}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function CartIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3h2l.4 2M7 13h10l4-8H5.4" />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M9 15h3" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );
}

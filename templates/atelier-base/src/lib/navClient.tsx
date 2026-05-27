"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { NavSettings } from "./settings";

const DEFAULT: NavSettings = {
  links: [
    { id: "home", label_en: "Home", label_el: "Αρχική", label_de: "Start", label_it: "Home", href: "/", enabled: true },
    { id: "services", label_en: "Services", label_el: "Υπηρεσίες", label_de: "Leistungen", label_it: "Servizi", href: "/services", enabled: true },
    { id: "shop", label_en: "Shop", label_el: "Κατάστημα", label_de: "Shop", label_it: "Negozio", href: "/shop", enabled: true },
    { id: "gallery", label_en: "Gallery", label_el: "Γκαλερί", label_de: "Galerie", label_it: "Galleria", href: "/gallery", enabled: true },
    { id: "team", label_en: "Team", label_el: "Ομάδα", label_de: "Team", label_it: "Team", href: "/about", enabled: true },
    { id: "contact", label_en: "Contact", label_el: "Επικοινωνία", label_de: "Kontakt", label_it: "Contatti", href: "/contact", enabled: true },
  ],
  bookLabel_en: "Book",
  bookLabel_el: "Κράτηση",
  bookLabel_de: "Buchen",
  bookLabel_it: "Prenota",
  bookHref: "/book",
};

type Ctx = {
  nav: NavSettings;
  refresh: () => Promise<void>;
  setNav: (n: NavSettings) => void;
};

const NavCtx = createContext<Ctx | null>(null);

export function NavProvider({
  initial,
  children,
}: {
  initial?: NavSettings;
  children: ReactNode;
}) {
  const [nav, setNav] = useState<NavSettings>(initial ?? DEFAULT);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/nav", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as { nav?: NavSettings };
      if (d.nav) setNav({ ...DEFAULT, ...d.nav });
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!initial) refresh();
  }, [initial, refresh]);

  return (
    <NavCtx.Provider value={{ nav, refresh, setNav }}>{children}</NavCtx.Provider>
  );
}

export function useNavSettings(): Ctx {
  const ctx = useContext(NavCtx);
  if (!ctx) return { nav: DEFAULT, refresh: async () => {}, setNav: () => {} };
  return ctx;
}

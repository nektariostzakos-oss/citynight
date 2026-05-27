"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { BrandingSettings } from "./settings";

// Client-side fallback — kept generic so a clean install doesn't flash
// someone else's brand on first paint.
const DEFAULT_BRANDING: BrandingSettings = {
  logoUrl: "",
  faviconUrl: "",
  wordmark: "YOUR SALON",
  tagline_en: "Haircare · Your City",
  tagline_el: "Κομμωτήριο · Πόλη",
};

type Ctx = {
  branding: BrandingSettings;
  refresh: () => Promise<void>;
  setBranding: (b: BrandingSettings) => void;
};

const BrandingCtx = createContext<Ctx | null>(null);

export function BrandingProvider({
  initial,
  children,
}: {
  initial?: BrandingSettings;
  children: ReactNode;
}) {
  const [branding, setBranding] = useState<BrandingSettings>(
    initial ?? DEFAULT_BRANDING
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/branding", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as { branding?: BrandingSettings };
      if (d.branding) setBranding({ ...DEFAULT_BRANDING, ...d.branding });
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!initial) refresh();
  }, [initial, refresh]);

  return (
    <BrandingCtx.Provider value={{ branding, refresh, setBranding }}>
      {children}
    </BrandingCtx.Provider>
  );
}

export function useBranding(): Ctx {
  const ctx = useContext(BrandingCtx);
  if (!ctx) {
    return {
      branding: DEFAULT_BRANDING,
      refresh: async () => {},
      setBranding: () => {},
    };
  }
  return ctx;
}

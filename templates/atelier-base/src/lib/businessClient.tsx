"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { BusinessSettings } from "./settings";

// Client-side fallback when /api/business hasn't returned yet (first paint
// on a freshly-installed site). Kept generic so the flash doesn't show
// someone else's brand.
const DEFAULT: BusinessSettings = {
  name: "Your Salon",
  streetAddress: "",
  city: "",
  postalCode: "",
  country: "GB",
  phone: "",
  email: "",
  timezone: "Europe/London",
  latitude: null,
  longitude: null,
  hours: [
    { day: "mon", open: "10:00", close: "19:00", closed: false },
    { day: "tue", open: "10:00", close: "19:00", closed: false },
    { day: "wed", open: "10:00", close: "19:00", closed: false },
    { day: "thu", open: "10:00", close: "19:00", closed: false },
    { day: "fri", open: "10:00", close: "19:00", closed: false },
    { day: "sat", open: "10:00", close: "17:00", closed: false },
    { day: "sun", open: "00:00", close: "00:00", closed: true },
  ],
  social: { instagram: "", facebook: "", whatsapp: "", tiktok: "" },
  priceRange: "$$",
};

type Ctx = {
  business: BusinessSettings;
  refresh: () => Promise<void>;
  setBusiness: (b: BusinessSettings) => void;
};

const BusinessCtx = createContext<Ctx | null>(null);

export function BusinessProvider({
  initial,
  children,
}: {
  initial?: BusinessSettings;
  children: ReactNode;
}) {
  const [business, setBusiness] = useState<BusinessSettings>(initial ?? DEFAULT);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/business", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as { business?: BusinessSettings };
      if (d.business) setBusiness({ ...DEFAULT, ...d.business });
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!initial) refresh();
  }, [initial, refresh]);

  return (
    <BusinessCtx.Provider value={{ business, refresh, setBusiness }}>
      {children}
    </BusinessCtx.Provider>
  );
}

export function useBusiness(): Ctx {
  const ctx = useContext(BusinessCtx);
  if (!ctx) {
    return {
      business: DEFAULT,
      refresh: async () => {},
      setBusiness: () => {},
    };
  }
  return ctx;
}

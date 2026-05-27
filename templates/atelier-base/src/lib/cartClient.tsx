"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "./products";

export type CartItem = {
  id: string;
  slug: string;
  name_en: string;
  name_el: string;
  price: number;
  image: string;
  qty: number;
};

type Ctx = {
  items: CartItem[];
  count: number;
  total: number;
  add: (p: Product, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Sidebar drawer state — opened automatically by `add()`. */
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const Ctx = createContext<Ctx | null>(null);
const STORAGE_KEY = "atelier_cart";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  // Let the rest of the app know (e.g. nav badge).
  window.dispatchEvent(new CustomEvent("atelier-cart-changed"));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setItems(read());
    const sync = () => setItems(read());
    window.addEventListener("storage", sync);
    window.addEventListener("atelier-cart-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("atelier-cart-changed", sync);
    };
  }, []);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = isOpen ? "hidden" : prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const value = useMemo<Ctx>(() => {
    const total = items.reduce((s, it) => s + it.price * it.qty, 0);
    const count = items.reduce((s, it) => s + it.qty, 0);
    return {
      items,
      count,
      total,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add: (p, q = 1) => {
        const existing = items.find((i) => i.id === p.id);
        const next = existing
          ? items.map((i) =>
              i.id === p.id ? { ...i, qty: i.qty + q } : i
            )
          : [
              ...items,
              {
                id: p.id,
                slug: p.slug,
                name_en: p.name_en,
                name_el: p.name_el,
                price: p.price,
                image: p.image,
                qty: q,
              },
            ];
        setItems(next);
        write(next);
        setIsOpen(true); // open the drawer on add
      },
      setQty: (id, q) => {
        // Clamp: remove at 0, integer ≥ 1, max 99 (defensive — prevents a
        // user spamming + into a wild quantity that later oversells stock).
        const clamped = Math.floor(Number(q));
        if (!Number.isFinite(clamped) || clamped <= 0) {
          const next = items.filter((i) => i.id !== id);
          setItems(next);
          write(next);
          return;
        }
        const safe = Math.min(99, clamped);
        const next = items.map((i) => (i.id === id ? { ...i, qty: safe } : i));
        setItems(next);
        write(next);
      },
      remove: (id) => {
        const next = items.filter((i) => i.id !== id);
        setItems(next);
        write(next);
      },
      clear: () => {
        setItems([]);
        write([]);
      },
    };
  }, [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) {
    return {
      items: [] as CartItem[],
      count: 0,
      total: 0,
      add: () => {},
      setQty: () => {},
      remove: () => {},
      clear: () => {},
      isOpen: false,
      open: () => {},
      close: () => {},
    };
  }
  return c;
}

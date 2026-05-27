"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useCart } from "../../lib/cartClient";
import { useLang } from "../../lib/i18n";
import { withBasePath } from "../../lib/basePath";

/**
 * Sliding cart drawer. Auto-opens when an item is added (see `add()` in
 * cartClient.tsx). Lives once in the root layout so any "Add to cart" on
 * any page triggers it.
 */
export default function CartSidebar() {
  const { items, total, count, isOpen, close, setQty, remove } = useCart();
  const { lang } = useLang();
  const pick = (en: string, el: string) => (lang === "el" ? el || en : en);

  // ESC closes
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            aria-hidden
          />
          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 z-[81] flex h-[100dvh] w-full max-w-md flex-col border-l border-white/10 bg-[#0a0806] text-white shadow-[0_-40px_120px_-20px_rgba(0,0,0,0.8)]"
            role="dialog"
            aria-modal="true"
            aria-label={pick("Cart", "Καλάθι")}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">
                  {pick("Cart", "Καλάθι")}
                </p>
                <p className="mt-1 font-serif text-2xl">
                  {count === 0
                    ? pick("Empty", "Άδειο")
                    : count === 1
                      ? pick("1 item", "1 προϊόν")
                      : pick(`${count} items`, `${count} προϊόντα`)}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label={pick("Close cart", "Κλείσιμο")}
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-12 text-center">
                  <p className="font-serif text-2xl text-white/70">
                    {pick("Your cart is empty.", "Το καλάθι σου είναι άδειο.")}
                  </p>
                  <Link
                    href="/shop"
                    onClick={close}
                    className="rounded-full border border-[var(--gold)]/60 bg-[var(--gold)]/10 px-5 py-2 text-xs uppercase tracking-widest text-[var(--gold)] hover:bg-[var(--gold)] hover:text-black"
                  >
                    {pick("Browse the shop", "Δες το κατάστημα")}
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-white/10">
                  {items.map((it) => (
                    <li key={it.id} className="flex gap-4 px-6 py-5">
                      <Link
                        href={`/shop/${it.slug}`}
                        onClick={close}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#14110d]"
                      >
                        <Image
                          src={withBasePath(it.image)}
                          alt={pick(it.name_en, it.name_el)}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/shop/${it.slug}`}
                          onClick={close}
                          className="block truncate font-serif text-base text-white hover:text-[var(--gold)]"
                        >
                          {pick(it.name_en, it.name_el)}
                        </Link>
                        <p className="mt-0.5 text-sm text-[var(--gold)]">
                          ${(it.price * it.qty).toFixed(2)}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.03] p-0.5">
                            <button
                              type="button"
                              onClick={() => setQty(it.id, it.qty - 1)}
                              className="grid h-7 w-7 place-items-center rounded-full text-white/80 hover:bg-white/10"
                              aria-label={pick("Decrease quantity", "Μείωση")}
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-mono text-sm">{it.qty}</span>
                            <button
                              type="button"
                              onClick={() => setQty(it.id, it.qty + 1)}
                              className="grid h-7 w-7 place-items-center rounded-full text-white/80 hover:bg-white/10"
                              aria-label={pick("Increase quantity", "Αύξηση")}
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(it.id)}
                            className="text-[10px] uppercase tracking-widest text-white/45 hover:text-white/80"
                          >
                            {pick("Remove", "Αφαίρεση")}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer / checkout */}
            {items.length > 0 && (
              <div className="border-t border-white/10 px-6 py-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-white/55">
                    {pick("Subtotal", "Σύνολο")}
                  </span>
                  <span className="font-serif text-2xl text-[var(--gold)]">
                    ${total.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">
                  {pick("Shipping calculated at checkout", "Μεταφορικά υπολογίζονται στο checkout")}
                </p>
                <div className="mt-4 grid gap-2">
                  <Link
                    href="/cart"
                    onClick={close}
                    className="grid place-items-center rounded-full bg-[var(--gold)] px-5 py-3 text-xs font-semibold uppercase tracking-widest text-black hover:bg-[var(--gold-2)]"
                  >
                    {pick("Checkout", "Πληρωμή")} →
                  </Link>
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10"
                  >
                    {pick("Keep shopping", "Συνέχισε αγορές")}
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

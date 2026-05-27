"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { useLang } from "../../lib/i18n";
import { useCart } from "../../lib/cartClient";
import { withBasePath } from "../../lib/basePath";
import { langField, langPick } from "../../lib/langs";
import type { Product } from "../../lib/products";
import ExpressCheckout from "./ExpressCheckout";

const COPY = {
  backToShop: {
    en: "Back to shop",
    el: "Πίσω στο κατάστημα",
    de: "Zurück zum Shop",
    fr: "Retour à la boutique",
    it: "Torna al negozio",
    es: "Volver a la tienda",
    nl: "Terug naar de shop",
    pl: "Powrót do sklepu",
    pt: "Voltar à loja",
    sv: "Tillbaka till butiken",
    sq: "Kthehu te dyqani",
  },
  added: {
    en: "Added ✓",
    el: "Προστέθηκε ✓",
    de: "Hinzugefügt ✓",
    fr: "Ajouté ✓",
    it: "Aggiunto ✓",
    es: "Añadido ✓",
    nl: "Toegevoegd ✓",
    pl: "Dodano ✓",
    pt: "Adicionado ✓",
    sv: "Tillagd ✓",
    sq: "U shtua ✓",
  },
  soldOut: {
    en: "Sold out",
    el: "Εξαντλημένο",
    de: "Ausverkauft",
    fr: "Épuisé",
    it: "Esaurito",
    es: "Agotado",
    nl: "Uitverkocht",
    pl: "Wyprzedane",
    pt: "Esgotado",
    sv: "Slutsåld",
    sq: "U shit i gjithi",
  },
  addToCart: {
    en: "Add to cart",
    el: "Στο καλάθι",
    de: "In den Warenkorb",
    fr: "Ajouter au panier",
    it: "Aggiungi al carrello",
    es: "Añadir al carrito",
    nl: "In winkelwagen",
    pl: "Do koszyka",
    pt: "Adicionar ao carrinho",
    sv: "Lägg i kundvagn",
    sq: "Shto në shportë",
  },
  buyNow: {
    en: "Buy now",
    el: "Άμεση αγορά",
    de: "Jetzt kaufen",
    fr: "Acheter maintenant",
    it: "Acquista ora",
    es: "Comprar ahora",
    nl: "Nu kopen",
    pl: "Kup teraz",
    pt: "Comprar agora",
    sv: "Köp nu",
    sq: "Blej tani",
  },
  youMayAlsoLike: {
    en: "You may also like",
    el: "Σχετικά",
    de: "Das könnte dir auch gefallen",
    fr: "Vous aimerez aussi",
    it: "Potrebbe piacerti anche",
    es: "También te puede gustar",
    nl: "Misschien vind je dit ook leuk",
    pl: "Może ci się spodobać",
    pt: "Também pode gostar",
    sv: "Du kanske också gillar",
    sq: "Mund t'ju pëlqejë gjithashtu",
  },
  pairsWellWith: {
    en: "Pairs well with",
    el: "Συμπληρωματικά προϊόντα",
    de: "Passt gut zu",
    fr: "Se marie bien avec",
    it: "Si abbina bene con",
    es: "Combina bien con",
    nl: "Past goed bij",
    pl: "Dobrze łączy się z",
    pt: "Combina bem com",
    sv: "Passar bra med",
    sq: "Shkon mirë me",
  },
  allProducts: {
    en: "All products →",
    el: "Όλα τα προϊόντα →",
    de: "Alle Produkte →",
    fr: "Tous les produits →",
    it: "Tutti i prodotti →",
    es: "Todos los productos →",
    nl: "Alle producten →",
    pl: "Wszystkie produkty →",
    pt: "Todos os produtos →",
    sv: "Alla produkter →",
    sq: "Të gjitha produktet →",
  },
};

const STOCK_LABEL: Record<string, (n: number) => string> = {
  en: (n) => `${n} in stock`,
  el: (n) => `${n} σε απόθεμα`,
  de: (n) => `${n} auf Lager`,
  fr: (n) => `${n} en stock`,
  it: (n) => `${n} disponibili`,
  es: (n) => `${n} en stock`,
  nl: (n) => `${n} op voorraad`,
  pl: (n) => `${n} w magazynie`,
  pt: (n) => `${n} em stock`,
  sv: (n) => `${n} i lager`,
  sq: (n) => `${n} në stok`,
};

export default function ProductDetail({
  product,
  related = [],
  stripePublishableKey,
  currency = "usd",
}: {
  product: Product;
  related?: Product[];
  stripePublishableKey?: string | null;
  currency?: string;
}) {
  const { lang, t } = useLang();
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function addToCart() {
    add(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  }

  return (
    <section className="px-6 pb-32">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
        <Link
          href="/shop"
          className="col-span-full text-xs uppercase tracking-widest text-white/60 hover:text-white"
        >
          ← {langPick(COPY.backToShop, lang)}
        </Link>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="relative aspect-square overflow-hidden rounded-2xl border border-white/10"
        >
          <Image
            src={withBasePath(product.image)}
            alt={langField(product, "name", lang)}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">
            {langField(product, "category", lang)}
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            {langField(product, "name", lang)}
          </h1>
          <p className="mt-5 text-lg text-white/70">
            {langField(product, "shortDesc", lang)}
          </p>
          <p className="mt-6 font-serif text-5xl text-[var(--gold)]">
            ${product.price}
          </p>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] p-1">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-9 w-9 rounded-full text-white/80 hover:bg-white/10"
              >
                −
              </button>
              <span className="w-6 text-center font-serif text-lg">{qty}</span>
              <button
                onClick={() =>
                  setQty((q) => Math.min(product.stock, q + 1))
                }
                disabled={qty >= product.stock}
                className="h-9 w-9 rounded-full text-white/80 hover:bg-white/10 disabled:opacity-30"
              >
                +
              </button>
            </div>
            <button
              onClick={addToCart}
              disabled={product.stock === 0}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-40"
            >
              {added
                ? langPick(COPY.added, lang)
                : product.stock === 0
                  ? langPick(COPY.soldOut, lang)
                  : langPick(COPY.addToCart, lang)}
            </button>
          </div>

          <p className="mt-4 text-xs uppercase tracking-widest text-white/65">
            {product.stock > 0
              ? (STOCK_LABEL[lang] ?? STOCK_LABEL.en)(product.stock)
              : ""}
          </p>

          {product.stock > 0 && stripePublishableKey && (
            <div className="mt-6 max-w-sm">
              <p className="mb-2 text-[10px] uppercase tracking-widest text-white/50">
                {langPick(COPY.buyNow, lang)}
              </p>
              <ExpressCheckout
                items={[{ id: product.id, qty }]}
                amount={product.price * qty}
                stripePublishableKey={stripePublishableKey}
                currency={currency}
              />
            </div>
          )}

          <div className="mt-10 border-t border-white/10 pt-8">
            <p className="whitespace-pre-line text-white/70">
              {langField(product, "longDesc", lang)}
            </p>
          </div>
        </motion.div>
      </div>

      {related.length > 0 && (
        <div className="mx-auto mt-24 max-w-6xl">
          <div className="mb-8 flex items-baseline justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--gold)]">
                {langPick(COPY.youMayAlsoLike, lang)}
              </p>
              <h2 className="mt-2 font-serif text-2xl sm:text-3xl">
                {langPick(COPY.pairsWellWith, lang)}
              </h2>
            </div>
            <Link
              href="/shop"
              className="hidden text-[10px] uppercase tracking-widest text-white/55 hover:text-white sm:inline-block"
            >
              {langPick(COPY.allProducts, lang)}
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/shop/${r.slug}`}
                className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-colors hover:border-[var(--gold)]/40"
              >
                <div className="relative aspect-square overflow-hidden bg-[#14110d]">
                  <Image
                    src={withBasePath(r.image)}
                    alt={langField(r, "name", lang)}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--gold)]">
                    {langField(r, "category", lang)}
                  </p>
                  <h3 className="mt-2 font-serif text-xl text-white transition-colors group-hover:text-[var(--gold)]">
                    {langField(r, "name", lang)}
                  </h3>
                  <p className="mt-3 font-serif text-2xl text-[var(--gold)]">
                    ${r.price}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

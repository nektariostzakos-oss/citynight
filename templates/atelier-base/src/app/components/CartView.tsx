"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../lib/cartClient";
import { useLang } from "../../lib/i18n";
import { langPick } from "../../lib/langs";
import { withBasePath, clientPath } from "../../lib/basePath";
import ExpressCheckout from "./ExpressCheckout";

const COPY = {
  thankYou: {
    en: "Thank you!", el: "Ευχαριστούμε!", de: "Vielen Dank!", fr: "Merci !",
    it: "Grazie!", es: "¡Gracias!", nl: "Bedankt!", pl: "Dziękujemy!",
    pt: "Obrigado!", sv: "Tack!", sq: "Faleminderit!",
  },
  orderReceived: {
    en: "We received your order. We'll be in touch about payment and delivery.",
    el: "Λάβαμε την παραγγελία σου. Θα επικοινωνήσουμε μαζί σου για την πληρωμή και την αποστολή.",
    de: "Wir haben deine Bestellung erhalten. Wir melden uns bei dir wegen Zahlung und Lieferung.",
    fr: "Nous avons reçu votre commande. Nous vous recontacterons pour le paiement et la livraison.",
    it: "Abbiamo ricevuto il tuo ordine. Ti contatteremo per il pagamento e la consegna.",
    es: "Hemos recibido tu pedido. Te contactaremos sobre el pago y la entrega.",
    nl: "We hebben je bestelling ontvangen. We nemen contact op over betaling en levering.",
    pl: "Otrzymaliśmy Twoje zamówienie. Skontaktujemy się w sprawie płatności i dostawy.",
    pt: "Recebemos a sua encomenda. Entraremos em contacto sobre o pagamento e a entrega.",
    sv: "Vi har tagit emot din beställning. Vi hör av oss om betalning och leverans.",
    sq: "E morëm porosinë tënde. Do të kontaktojmë për pagesën dhe dërgesën.",
  },
  reference: {
    en: "Reference", el: "Κωδικός", de: "Referenz", fr: "Référence",
    it: "Riferimento", es: "Referencia", nl: "Referentie", pl: "Numer",
    pt: "Referência", sv: "Referens", sq: "Referenca",
  },
  giftCardCodes: {
    en: "Gift card codes",
    el: "Κωδικοί δωροεπιταγής",
    de: "Geschenkkarten-Codes",
    fr: "Codes carte cadeau",
    it: "Codici buono regalo",
    es: "Códigos de tarjeta regalo",
    nl: "Cadeaubon-codes",
    pl: "Kody kart podarunkowych",
    pt: "Códigos do vale de oferta",
    sv: "Presentkortskoder",
    sq: "Kodet e kartës dhuratë",
  },
  saveCode: {
    en: "Save the code. Show it at the till to redeem in the chair.",
    el: "Φυλάξτε τον κωδικό. Τον χρειάζονται στο ταμείο για εξαργύρωση.",
    de: "Bewahre den Code auf. Zeig ihn an der Kasse, um ihn einzulösen.",
    fr: "Conservez le code. Présentez-le en caisse pour en profiter au fauteuil.",
    it: "Conserva il codice. Mostralo alla cassa per riscattarlo.",
    es: "Guarda el código. Muéstralo en caja para canjearlo en el sillón.",
    nl: "Bewaar de code. Toon hem aan de kassa om hem in de stoel te verzilveren.",
    pl: "Zachowaj kod. Pokaż go w kasie, by zrealizować go w fotelu.",
    pt: "Guarde o código. Mostre-o na caixa para o usar na cadeira.",
    sv: "Spara koden. Visa den i kassan för att lösa in den i stolen.",
    sq: "Ruaje kodin. Tregoje në arkë për ta përdorur te karrigia.",
  },
  keepShopping: {
    en: "Keep shopping",
    el: "Συνέχεια αγορών",
    de: "Weiter einkaufen",
    fr: "Continuer les achats",
    it: "Continua lo shopping",
    es: "Seguir comprando",
    nl: "Verder winkelen",
    pl: "Kupuj dalej",
    pt: "Continuar a comprar",
    sv: "Fortsätt handla",
    sq: "Vazhdo blerjet",
  },
  cartEmpty: {
    en: "Your cart is empty.",
    el: "Το καλάθι σου είναι άδειο.",
    de: "Dein Warenkorb ist leer.",
    fr: "Votre panier est vide.",
    it: "Il tuo carrello è vuoto.",
    es: "Tu carrito está vacío.",
    nl: "Je winkelwagen is leeg.",
    pl: "Twój koszyk jest pusty.",
    pt: "O seu carrinho está vazio.",
    sv: "Din varukorg är tom.",
    sq: "Shporta jote është bosh.",
  },
  goToShop: {
    en: "Go to shop", el: "Στο κατάστημα", de: "Zum Shop", fr: "Aller à la boutique",
    it: "Vai al negozio", es: "Ir a la tienda", nl: "Naar de winkel", pl: "Przejdź do sklepu",
    pt: "Ir para a loja", sv: "Till butiken", sq: "Shko te dyqani",
  },
  remove: {
    en: "Remove", el: "Αφαίρεση", de: "Entfernen", fr: "Retirer",
    it: "Rimuovi", es: "Quitar", nl: "Verwijderen", pl: "Usuń",
    pt: "Remover", sv: "Ta bort", sq: "Hiqe",
  },
  summary: {
    en: "Summary", el: "Σύνοψη", de: "Übersicht", fr: "Récapitulatif",
    it: "Riepilogo", es: "Resumen", nl: "Overzicht", pl: "Podsumowanie",
    pt: "Resumo", sv: "Sammanfattning", sq: "Përmbledhje",
  },
  subtotal: {
    en: "Subtotal", el: "Υποσύνολο", de: "Zwischensumme", fr: "Sous-total",
    it: "Subtotale", es: "Subtotal", nl: "Subtotaal", pl: "Suma częściowa",
    pt: "Subtotal", sv: "Delsumma", sq: "Nëntotali",
  },
  shippingNote: {
    en: "Shipping calculated at delivery.",
    el: "Τα μεταφορικά υπολογίζονται στην παράδοση.",
    de: "Versandkosten werden bei der Lieferung berechnet.",
    fr: "Frais de livraison calculés à la livraison.",
    it: "Le spese di spedizione sono calcolate alla consegna.",
    es: "Los gastos de envío se calculan en la entrega.",
    nl: "Verzendkosten worden bij levering berekend.",
    pl: "Koszt wysyłki naliczany przy dostawie.",
    pt: "Portes calculados na entrega.",
    sv: "Frakt beräknas vid leverans.",
    sq: "Transporti llogaritet në dorëzim.",
  },
  expressCheckout: {
    en: "Express checkout",
    el: "Γρήγορη πληρωμή",
    de: "Express-Bezahlung",
    fr: "Paiement express",
    it: "Pagamento rapido",
    es: "Pago exprés",
    nl: "Snel afrekenen",
    pl: "Szybka płatność",
    pt: "Pagamento expresso",
    sv: "Snabbkassa",
    sq: "Pagesë e shpejtë",
  },
  orWithCard: {
    en: "or with card / cash on delivery",
    el: "ή με κάρτα / αντικαταβολή",
    de: "oder mit Karte / Nachnahme",
    fr: "ou par carte / paiement à la livraison",
    it: "o con carta / contrassegno",
    es: "o con tarjeta / contra reembolso",
    nl: "of met kaart / rembours",
    pl: "lub kartą / za pobraniem",
    pt: "ou com cartão / pagamento na entrega",
    sv: "eller med kort / postförskott",
    sq: "ose me kartë / pagesë në dorëzim",
  },
  deliveryDetails: {
    en: "Delivery details",
    el: "Στοιχεία παράδοσης",
    de: "Lieferdetails",
    fr: "Détails de livraison",
    it: "Dettagli di consegna",
    es: "Datos de entrega",
    nl: "Bezorggegevens",
    pl: "Dane dostawy",
    pt: "Dados de entrega",
    sv: "Leveransuppgifter",
    sq: "Të dhënat e dërgesës",
  },
  fullName: {
    en: "Full name", el: "Ονοματεπώνυμο", de: "Vollständiger Name", fr: "Nom complet",
    it: "Nome completo", es: "Nombre completo", nl: "Volledige naam", pl: "Imię i nazwisko",
    pt: "Nome completo", sv: "Fullständigt namn", sq: "Emri i plotë",
  },
  phone: {
    en: "Phone", el: "Τηλέφωνο", de: "Telefon", fr: "Téléphone",
    it: "Telefono", es: "Teléfono", nl: "Telefoon", pl: "Telefon",
    pt: "Telefone", sv: "Telefon", sq: "Telefoni",
  },
  address: {
    en: "Address", el: "Διεύθυνση", de: "Adresse", fr: "Adresse",
    it: "Indirizzo", es: "Dirección", nl: "Adres", pl: "Adres",
    pt: "Morada", sv: "Adress", sq: "Adresa",
  },
  city: {
    en: "City", el: "Πόλη", de: "Stadt", fr: "Ville",
    it: "Città", es: "Ciudad", nl: "Stad", pl: "Miasto",
    pt: "Cidade", sv: "Stad", sq: "Qyteti",
  },
  postal: {
    en: "Postal", el: "Τ.Κ.", de: "PLZ", fr: "Code postal",
    it: "CAP", es: "C.P.", nl: "Postcode", pl: "Kod pocztowy",
    pt: "Cód. postal", sv: "Postnr", sq: "Kodi postar",
  },
  notes: {
    en: "Notes", el: "Σημειώσεις", de: "Notizen", fr: "Remarques",
    it: "Note", es: "Notas", nl: "Opmerkingen", pl: "Uwagi",
    pt: "Notas", sv: "Anteckningar", sq: "Shënime",
  },
  placingOrder: {
    en: "Placing order…",
    el: "Αποστολή…",
    de: "Bestellung wird aufgegeben…",
    fr: "Envoi de la commande…",
    it: "Invio dell'ordine…",
    es: "Enviando el pedido…",
    nl: "Bestelling plaatsen…",
    pl: "Składanie zamówienia…",
    pt: "A enviar a encomenda…",
    sv: "Lägger beställning…",
    sq: "Po dërgohet porosia…",
  },
  placeOrder: {
    en: "Place order",
    el: "Ολοκλήρωση παραγγελίας",
    de: "Bestellung aufgeben",
    fr: "Passer la commande",
    it: "Conferma ordine",
    es: "Realizar pedido",
    nl: "Bestelling plaatsen",
    pl: "Złóż zamówienie",
    pt: "Finalizar encomenda",
    sv: "Lägg beställning",
    sq: "Bëj porosinë",
  },
  paymentNote: {
    en: "Cash on delivery or bank transfer. We'll be in touch to confirm.",
    el: "Cash on delivery ή bank transfer. Θα επικοινωνήσουμε για λεπτομέρειες.",
    de: "Nachnahme oder Banküberweisung. Wir melden uns zur Bestätigung.",
    fr: "Paiement à la livraison ou virement bancaire. Nous vous contacterons pour confirmer.",
    it: "Contrassegno o bonifico bancario. Ti contatteremo per la conferma.",
    es: "Contra reembolso o transferencia bancaria. Te contactaremos para confirmar.",
    nl: "Rembours of bankoverschrijving. We nemen contact op ter bevestiging.",
    pl: "Płatność za pobraniem lub przelew bankowy. Skontaktujemy się, by potwierdzić.",
    pt: "Pagamento na entrega ou transferência bancária. Entraremos em contacto para confirmar.",
    sv: "Postförskott eller banköverföring. Vi hör av oss för att bekräfta.",
    sq: "Pagesë në dorëzim ose transfertë bankare. Do të kontaktojmë për konfirmim.",
  },
} as const;

export default function CartView({
  stripePublishableKey,
  currency = "usd",
}: {
  stripePublishableKey?: string | null;
  currency?: string;
} = {}) {
  const { items, total, setQty, remove, clear } = useCart();
  const { t, lang } = useLang();
  const pick = (en: string, el: string) => (lang === "el" ? el || en : en);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    postal: "",
    notes: "",
    website: "", // honeypot
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; gifts?: Array<{ code: string; amount: number }> } | null>(null);

  // Restore + persist form draft so a refresh mid-checkout doesn't wipe it.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("atelier_cart_draft_v1");
      if (raw) {
        const d = JSON.parse(raw) as Partial<typeof form>;
        setForm((f) => ({ ...f, ...d, website: "" }));
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const { website: _website, ...persist } = form;
      window.localStorage.setItem("atelier_cart_draft_v1", JSON.stringify(persist));
    } catch {}
  }, [form]);

  async function checkout() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({
          id: i.id,
          name: pick(i.name_en, i.name_el),
          price: i.price,
          qty: i.qty,
        })),
        ...form,
        lang,
      }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(d.error || "Order failed");
      return;
    }
    try { window.localStorage.removeItem("atelier_cart_draft_v1"); } catch {}
    clear();
    // Stripe configured? Bounce straight to hosted Checkout. Otherwise we
    // show the in-app "thanks, we'll contact you about payment" screen.
    if (typeof d.checkoutUrl === "string" && d.checkoutUrl) {
      window.location.href = d.checkoutUrl;
      return;
    }
    setDone({ id: d.order.id, gifts: Array.isArray(d.gifts) ? d.gifts : [] });
  }

  if (done) {
    return (
      <section className="px-6 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-2xl rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-12 text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--gold)] text-2xl text-black">
            ✓
          </div>
          <h2 className="font-serif text-4xl font-semibold tracking-tight">
            {langPick(COPY.thankYou, lang)}
          </h2>
          <p className="mt-3 text-white/65">
            {langPick(COPY.orderReceived, lang)}
          </p>
          <p className="mt-2 text-xs uppercase tracking-widest text-white/60">
            {langPick(COPY.reference, lang)} · {done.id}
          </p>

          {done.gifts && done.gifts.length > 0 && (
            <div className="mx-auto mt-6 max-w-md rounded-xl border border-[var(--gold)]/40 bg-black/40 p-4 text-left">
              <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">
                {langPick(COPY.giftCardCodes, lang)}
              </p>
              <ul className="space-y-1.5 text-sm">
                {done.gifts.map((g, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <code className="rounded bg-white/5 px-2 py-1 font-mono text-[var(--gold)]">{g.code}</code>
                    <span className="text-white/70">${g.amount}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-white/50">
                {langPick(COPY.saveCode, lang)}
              </p>
            </div>
          )}
          <Link
            href="/shop"
            className="mt-10 inline-block rounded-full bg-white px-6 py-3 text-sm font-medium text-black"
          >
            {langPick(COPY.keepShopping, lang)}
          </Link>
        </motion.div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="px-6 pb-32 text-center">
        <p className="mx-auto max-w-md text-white/55">
          {langPick(COPY.cartEmpty, lang)}
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-7 py-3 text-sm font-semibold uppercase tracking-widest text-black"
        >
          {langPick(COPY.goToShop, lang)} →
        </Link>
      </section>
    );
  }

  return (
    <section className="px-6 pb-32">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="divide-y divide-white/10 border-y border-white/10">
          <AnimatePresence>
            {items.map((it) => (
              <motion.div
                key={it.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-[64px_1fr_auto] items-center gap-3 py-5 sm:grid-cols-[80px_1fr_auto] sm:gap-4"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg border border-white/10">
                  <Image
                    src={withBasePath(it.image)}
                    alt={pick(it.name_en, it.name_el)}
                    fill
                    sizes="(max-width: 640px) 64px, 80px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <Link
                    href={`/shop/${it.slug}`}
                    className="font-serif text-lg hover:text-[var(--gold)]"
                  >
                    {pick(it.name_en, it.name_el)}
                  </Link>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.03] p-1 text-sm">
                      <button
                        onClick={() => setQty(it.id, it.qty - 1)}
                        className="h-7 w-7 rounded-full hover:bg-white/10"
                      >
                        −
                      </button>
                      <span className="w-6 text-center">{it.qty}</span>
                      <button
                        onClick={() => setQty(it.id, it.qty + 1)}
                        className="h-7 w-7 rounded-full hover:bg-white/10"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => remove(it.id)}
                      className="text-xs uppercase tracking-widest text-white/50 hover:text-red-300"
                    >
                      {langPick(COPY.remove, lang)}
                    </button>
                  </div>
                </div>
                <p className="font-serif text-lg text-[var(--gold)]">
                  ${(it.price * it.qty).toFixed(2)}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-4 font-serif text-2xl">
            {langPick(COPY.summary, lang)}
          </h2>
          <div className="flex justify-between border-b border-white/10 pb-3">
            <span className="text-white/60">
              {langPick(COPY.subtotal, lang)}
            </span>
            <span className="font-serif text-xl text-[var(--gold)]">
              ${total.toFixed(2)}
            </span>
          </div>
          <p className="mt-3 text-xs text-white/65">
            {langPick(COPY.shippingNote, lang)}
          </p>

          {stripePublishableKey && total > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-[10px] uppercase tracking-widest text-white/50">
                {langPick(COPY.expressCheckout, lang)}
              </p>
              <ExpressCheckout
                items={items.map((i) => ({ id: i.id, qty: i.qty }))}
                amount={total}
                currency={currency}
                stripePublishableKey={stripePublishableKey}
                email={form.email}
                onSuccess={(id) => {
                  try { window.localStorage.removeItem("atelier_cart_draft_v1"); } catch {}
                  clear();
                  window.location.href = clientPath(`/shop/thanks?order=${encodeURIComponent(id)}`);
                }}
              />
            </div>
          )}
          <div className="mt-6">
            <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-white/40">
              <span className="h-px flex-1 bg-white/10" />
              {langPick(COPY.orWithCard, lang)}
              <span className="h-px flex-1 bg-white/10" />
            </div>
          </div>

          <h3 className="mt-6 mb-3 text-xs uppercase tracking-widest text-white/50">
            {langPick(COPY.deliveryDetails, lang)}
          </h3>
          <div className="grid gap-3">
            <Field label={langPick(COPY.fullName, lang)} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label={langPick(COPY.phone, lang)} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <Field label={langPick(COPY.address, lang)} value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <Field label={langPick(COPY.city, lang)} value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label={langPick(COPY.postal, lang)} value={form.postal} onChange={(v) => setForm({ ...form, postal: v })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/65">
                {langPick(COPY.notes, lang)}
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
              />
            </div>
            {/* Honeypot */}
            <div style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            onClick={checkout}
            disabled={submitting}
            className="mt-6 w-full rounded-full bg-[var(--gold)] py-3 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-50"
          >
            {submitting
              ? langPick(COPY.placingOrder, lang)
              : langPick(COPY.placeOrder, lang)}
          </button>
          <p className="mt-3 text-xs text-white/65">
            {langPick(COPY.paymentNote, lang)}
          </p>
        </aside>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/65">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
      />
    </div>
  );
}

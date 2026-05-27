import Link from "next/link";
import { detectLang } from "../../../lib/i18nServer";
import { langPick } from "../../../lib/langs";
import { loadBusiness } from "../../../lib/settings";

export async function generateMetadata() {
  const business = await loadBusiness();
  const name = business.name || "Your Salon";
  return {
    title: `Order confirmed · ${name}`,
    robots: { index: false, follow: false },
  };
}

const copy = {
  heading: {
    en: "Payment received.",
    el: "Η πληρωμή ολοκληρώθηκε.",
    de: "Zahlung erhalten.",
    fr: "Paiement reçu.",
    it: "Pagamento ricevuto.",
    es: "Pago recibido.",
    nl: "Betaling ontvangen.",
    pl: "Płatność otrzymana.",
    pt: "Pagamento recebido.",
    sv: "Betalning mottagen.",
    sq: "Pagesa u krye.",
  },
  body: {
    en: "Thank you. We’ll prepare your order. A receipt from our payment provider is on its way to your inbox.",
    el: "Ευχαριστούμε. Θα προετοιμάσουμε την παραγγελία σας. Μια απόδειξη από τον πάροχο πληρωμής σας αποστέλλεται στο email σας.",
    de: "Danke. Wir bereiten deine Bestellung vor. Eine Quittung unseres Zahlungsanbieters ist auf dem Weg in dein Postfach.",
    fr: "Merci. Nous préparons votre commande. Un reçu de notre prestataire de paiement arrive dans votre boîte de réception.",
    it: "Grazie. Prepareremo il tuo ordine. Una ricevuta dal nostro fornitore di pagamenti sta arrivando nella tua casella di posta.",
    es: "Gracias. Prepararemos tu pedido. Un recibo de nuestro proveedor de pagos va de camino a tu bandeja de entrada.",
    nl: "Bedankt. We maken je bestelling klaar. Een bon van onze betaalprovider is onderweg naar je inbox.",
    pl: "Dziękujemy. Przygotujemy twoje zamówienie. Potwierdzenie od naszego dostawcy płatności jest już w drodze na twoją skrzynkę.",
    pt: "Obrigado. Vamos preparar a tua encomenda. Um recibo do nosso fornecedor de pagamentos vai a caminho da tua caixa de entrada.",
    sv: "Tack. Vi förbereder din beställning. Ett kvitto från vår betalleverantör är på väg till din inkorg.",
    sq: "Faleminderit. Do ta përgatisim porosinë tënde. Një faturë nga ofruesi ynë i pagesave po vjen te inbox-i yt.",
  },
  order: {
    en: "Order", el: "Παραγγελία", de: "Bestellung", fr: "Commande", it: "Ordine",
    es: "Pedido", nl: "Bestelling", pl: "Zamówienie", pt: "Encomenda", sv: "Beställning",
    sq: "Porosia",
  },
  cta: {
    en: "Keep shopping",
    el: "Συνέχεια αγορών",
    de: "Weiter einkaufen",
    fr: "Continuer les achats",
    it: "Continua a fare acquisti",
    es: "Seguir comprando",
    nl: "Verder winkelen",
    pl: "Kupuj dalej",
    pt: "Continuar a comprar",
    sv: "Fortsätt handla",
    sq: "Vazhdo blerjet",
  },
} satisfies Record<string, Record<string, string>>;

export default async function ShopThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const [{ order }, lang] = await Promise.all([
    searchParams,
    detectLang(undefined),
  ]);
  const t = (k: keyof typeof copy) => langPick(copy[k], lang);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-24">
      <div className="mx-auto max-w-lg rounded-2xl border p-10 text-center"
        style={{ borderColor: "color-mix(in srgb, var(--gold) 40%, transparent)", background: "color-mix(in srgb, var(--gold) 6%, transparent)" }}>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--gold)] text-2xl text-black">
          ✓
        </div>
        <h1 className="font-serif text-3xl" style={{ color: "var(--foreground)" }}>
          {t("heading")}
        </h1>
        <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
          {t("body")}
        </p>
        {order && (
          <p className="mt-6 text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-2)" }}>
            {t("order")} · {order}
          </p>
        )}
        <Link
          href="/shop"
          className="mt-10 inline-flex items-center rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-widest"
          style={{ background: "var(--gold)", color: "var(--background)" }}
        >
          {t("cta")}
        </Link>
      </div>
    </main>
  );
}

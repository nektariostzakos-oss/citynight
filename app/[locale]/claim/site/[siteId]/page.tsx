// Claim flow with package picker. Phase H — single "Claim" CTA lands here;
// owner picks how to manage the site (free, paid custom domain, or one-time
// ZIP). Claim happens on selection, then for paid plans we hand off to
// Stripe Checkout. Auth-gated.

import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth/session';
import { privateMetadata } from '@/lib/seo';
import { db } from '@/db';
import { ClaimPackagePicker, type ClaimPackageLabels } from '@/components/claim-package-picker';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = privateMetadata({ title: 'Choose your plan — citynight' });

const COPY: Record<Locale, ClaimPackageLabels & {
  heading: (n: string) => string;
  sub: (c: string) => string;
  alreadyClaimed: string;
}> = {
  el: {
    heading: (n) => `Διεκδίκηση: ${n}`,
    sub: (c) => `Είσαι ο ιδιοκτήτης του ${c}; Διάλεξε πώς θέλεις να το διαχειρίζεσαι.`,
    alreadyClaimed: 'Αυτή η σελίδα έχει ήδη διεκδικηθεί. Email: hello@citynight.gr.',
    freeName: 'Δωρεάν', freePrice: '€0', freePeriod: 'για πάντα',
    freeDesc: 'Το website σου ζει στο citynight.gr — μόνιμα δωρεάν.',
    freePoints: ['citynight.gr/.../μαγαζί', 'Hosting + SSL + auto updates', 'Επεξεργασία από dashboard', 'Καμία υποχρέωση'],
    freeCta: 'Διεκδίκησε δωρεάν',
    monthlyName: 'Custom domain', monthlyPrice: '€19', monthlyPeriod: '/μήνα',
    monthlyDesc: 'Σύνδεσε δικό σου .gr ή .com. SSL αυτόματο, η επωνυμία σου στο URL.',
    monthlyPoints: ['Όλα τα Δωρεάν', 'Δικό σου domain', 'SSL αυτόματο μέσω Cloudflare', 'Ακύρωση οποτεδήποτε'],
    monthlyCta: 'Διεκδίκησε + κλείδωσε domain',
    zipName: 'Self-host ZIP', zipPrice: '€190', zipPeriod: 'μια φορά',
    zipDesc: 'Κατέβασε το πλήρες project και τρέξε το στο δικό σου server. Χωρίς μηνιαία.',
    zipPoints: ['Όλος ο κώδικας δικός σου', 'Pre-filled με τα στοιχεία σου', 'Καμία μηνιαία χρέωση', 'Updates: ξανά-κατέβασμα'],
    zipCta: 'Διεκδίκησε + αγόρασε ZIP',
    busy: 'Άνοιγμα…', error: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.',
  },
  en: {
    heading: (n) => `Claim: ${n}`,
    sub: (c) => `Do you own ${c}? Pick how you want to manage it.`,
    alreadyClaimed: 'This page has already been claimed. Email: hello@citynight.gr.',
    freeName: 'Free', freePrice: '€0', freePeriod: 'forever',
    freeDesc: 'Your site lives at citynight.gr — free forever.',
    freePoints: ['citynight.gr/.../your-name', 'Hosting + SSL + automatic updates', 'Edit from the dashboard', 'No commitment'],
    freeCta: 'Claim free',
    monthlyName: 'Custom domain', monthlyPrice: '€19', monthlyPeriod: '/month',
    monthlyDesc: 'Point your own .gr or .com. SSL automatic, your brand in the URL.',
    monthlyPoints: ['Everything in Free', 'Your own domain', 'SSL via Cloudflare', 'Cancel anytime'],
    monthlyCta: 'Claim + add domain',
    zipName: 'Self-host ZIP', zipPrice: '€190', zipPeriod: 'one-time',
    zipDesc: 'Download the full project and run it on your own server. No monthly fee.',
    zipPoints: ['All code is yours', 'Pre-filled with your info', 'No monthly charges', 'Updates: redownload anytime'],
    zipCta: 'Claim + buy ZIP',
    busy: 'Opening…', error: 'Something went wrong. Try again.',
  },
  de: {
    heading: (n) => `Übernehmen: ${n}`,
    sub: (c) => `Gehört ${c} dir? Wähle, wie du die Seite verwalten willst.`,
    alreadyClaimed: 'Diese Seite wurde bereits beansprucht. Mail: hello@citynight.gr.',
    freeName: 'Kostenlos', freePrice: '€0', freePeriod: 'dauerhaft',
    freeDesc: 'Deine Seite lebt auf citynight.gr — dauerhaft kostenlos.',
    freePoints: ['citynight.gr/.../du', 'Hosting + SSL + Updates', 'Bearbeitung im Dashboard', 'Keine Verpflichtung'],
    freeCta: 'Kostenlos übernehmen',
    monthlyName: 'Eigene Domain', monthlyPrice: '€19', monthlyPeriod: '/Monat',
    monthlyDesc: 'Eigene .gr / .com. SSL automatisch, deine Marke in der URL.',
    monthlyPoints: ['Alles aus Kostenlos', 'Eigene Domain', 'SSL via Cloudflare', 'Jederzeit kündbar'],
    monthlyCta: 'Übernehmen + Domain',
    zipName: 'Self-host ZIP', zipPrice: '€190', zipPeriod: 'einmalig',
    zipDesc: 'Lade das Projekt herunter und betreibe es selbst. Keine monatliche Gebühr.',
    zipPoints: ['Quellcode gehört dir', 'Vorausgefüllt', 'Keine monatliche Gebühr', 'Updates erneut laden'],
    zipCta: 'Übernehmen + ZIP kaufen',
    busy: 'Öffne…', error: 'Etwas ist schiefgelaufen.',
  },
  fr: {
    heading: (n) => `Revendiquer : ${n}`,
    sub: (c) => `Vous êtes propriétaire de ${c} ? Choisissez comment gérer le site.`,
    alreadyClaimed: 'Cette page est déjà revendiquée. Email : hello@citynight.gr.',
    freeName: 'Gratuit', freePrice: '€0', freePeriod: 'à vie',
    freeDesc: 'Votre site vit sur citynight.gr — gratuit pour toujours.',
    freePoints: ['citynight.gr/.../vous', 'Hébergement + SSL + mises à jour', 'Édition depuis le dashboard', 'Sans engagement'],
    freeCta: 'Revendiquer gratuitement',
    monthlyName: 'Domaine perso', monthlyPrice: '€19', monthlyPeriod: '/mois',
    monthlyDesc: 'Pointez votre .gr ou .com. SSL automatique.',
    monthlyPoints: ['Tout le gratuit', 'Votre domaine', 'SSL via Cloudflare', 'Annulation à tout moment'],
    monthlyCta: 'Revendiquer + domaine',
    zipName: 'Self-host ZIP', zipPrice: '€190', zipPeriod: 'unique',
    zipDesc: 'Téléchargez le projet et hébergez-le vous-même.',
    zipPoints: ['Code à vous', 'Pré-rempli', 'Pas de frais mensuels', 'Mises à jour à volonté'],
    zipCta: 'Revendiquer + acheter ZIP',
    busy: 'Ouverture…', error: 'Erreur. Réessayez.',
  },
  it: {
    heading: (n) => `Rivendica: ${n}`,
    sub: (c) => `Sei il proprietario di ${c}? Scegli come gestirlo.`,
    alreadyClaimed: 'Questa pagina è già rivendicata. Email: hello@citynight.gr.',
    freeName: 'Gratis', freePrice: '€0', freePeriod: 'per sempre',
    freeDesc: 'Il tuo sito vive su citynight.gr — gratis per sempre.',
    freePoints: ['citynight.gr/.../tu', 'Hosting + SSL + aggiornamenti', 'Editing dal dashboard', 'Nessun impegno'],
    freeCta: 'Rivendica gratis',
    monthlyName: 'Dominio personalizzato', monthlyPrice: '€19', monthlyPeriod: '/mese',
    monthlyDesc: 'Punta il tuo .gr o .com. SSL automatico.',
    monthlyPoints: ['Tutto del Gratis', 'Il tuo dominio', 'SSL via Cloudflare', 'Cancellazione in qualsiasi momento'],
    monthlyCta: 'Rivendica + dominio',
    zipName: 'Self-host ZIP', zipPrice: '€190', zipPeriod: 'una tantum',
    zipDesc: 'Scarica il progetto e ospitalo sul tuo server.',
    zipPoints: ['Codice tuo', 'Pre-compilato', 'Nessun canone', 'Aggiornamenti sempre'],
    zipCta: 'Rivendica + compra ZIP',
    busy: 'Apertura…', error: 'Errore. Riprova.',
  },
};

export default async function ClaimSitePage({
  params,
}: {
  params: Promise<{ locale: string; siteId: string }>;
}) {
  const { locale, siteId } = await params;
  if (!isLocale(locale)) redirect('/el/sign-in');

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/claim/site/${siteId}`)}`);
  }

  const sqlite = db.$client;
  const sysUser = sqlite.prepare(`SELECT id FROM users WHERE email = 'system@citynight.gr'`).get() as { id: string } | undefined;
  const site = sqlite.prepare(`
    SELECT id, name, city, owner_id AS ownerId
      FROM sites WHERE id = ? AND status = 'published'
  `).get(siteId) as { id: string; name: string; city: string | null; ownerId: string } | undefined;
  if (!site) notFound();

  const t = COPY[locale];
  const alreadyMine = site.ownerId === user.id;
  const claimable = !alreadyMine && site.ownerId === sysUser?.id;

  if (alreadyMine) redirect(`/${locale}/dashboard/sites/${siteId}`);

  // Resolve server-only functions to strings before crossing the
  // server→client boundary — functions can't be serialised into Client
  // Component props.
  const { heading, sub, ...labels } = t;
  const headingText = heading(site.name);
  const subText = sub(site.city ?? site.name);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-fg-0)] md:text-4xl">
          {headingText}
        </h1>
        <p className="mt-3 text-[var(--color-fg-1)]">{subText}</p>
      </header>

      {claimable ? (
        <div className="mt-10">
          <ClaimPackagePicker siteId={siteId} locale={locale} labels={labels} />
        </div>
      ) : (
        <p className="mt-8 rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-5 text-sm text-[var(--color-fg-1)]">
          {labels.alreadyClaimed}
        </p>
      )}
    </main>
  );
}

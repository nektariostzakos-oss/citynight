import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import Link from 'next/link';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import { getVenueByCityArea, listRelatedVenues, getCityIdBySlug, getCategoryIdBySlug, listUpcomingVenueEvents } from '@/lib/queries';
import { VenueCard } from '@/components/venue-card';
import {
  publicMetadata, jsonLdProps,
  breadcrumbJsonLd, localBusinessJsonLd, faqJsonLd,
} from '@/lib/seo';
import { LazyMap } from '@/components/lazy-map';
import { AdSlot } from '@/components/ad-slot';
import { AffiliateBlock } from '@/components/affiliate-block';
import { ViewTracker } from '@/components/view-tracker';

// Venue pages — facts move slowly; revalidate every 6h. Owner edits +
// new events flip pages immediately via revalidatePath() from the venues
// PATCH + events POST routes, so this is just the worst-case freshness
// for non-edited venues.
export const revalidate = 21600;

// Per-locale chrome. Greek is the primary surface.
const COPY: Record<Locale, {
  claim: string;
  metaTitle: (v: string, c: string) => string;
  metaDescription: (v: string, c: string) => string;
  address: string;
  phone: string;
  website: string;
  more: (c: string) => string;
  allCityVenues: (c: string) => string;
  noPhotoYet: string;
  claimAndUpload: string;
}> = {
  en: { claim: 'Claim this venue', metaTitle: (v, c) => `${v} — ${c}`, metaDescription: (v, c) => `${v} in ${c}.`, address: 'Address', phone: 'Phone', website: 'Website', more: (c) => `More in ${c}`, allCityVenues: (c) => `All ${c} venues →`, noPhotoYet: 'No photo yet — owner?', claimAndUpload: 'Claim & upload' },
  el: { claim: 'Διεκδίκησε το μαγαζί',  metaTitle: (v, c) => `${v} — ${c}`,  metaDescription: (v, c) => `${v} στο ${c}.`, address: 'Διεύθυνση', phone: 'Τηλέφωνο', website: 'Site', more: (c) => `Περισσότερα στο ${c}`,  allCityVenues: (c) => `Όλα τα μαγαζιά στο ${c} →`, noPhotoYet: 'Χωρίς φωτογραφία — είσαι ο ιδιοκτήτης;', claimAndUpload: 'Διεκδίκησε & ανέβασε' },
  de: { claim: 'Location übernehmen',   metaTitle: (v, c) => `${v} — ${c}`,  metaDescription: (v, c) => `${v} in ${c}.`,  address: 'Adresse',   phone: 'Telefon',   website: 'Website', more: (c) => `Mehr in ${c}`,           allCityVenues: (c) => `Alle Locations in ${c} →`,         noPhotoYet: 'Noch kein Foto — Inhaber?',                       claimAndUpload: 'Übernehmen & hochladen' },
  fr: { claim: 'Revendiquer le lieu',   metaTitle: (v, c) => `${v} — ${c}`,  metaDescription: (v, c) => `${v} à ${c}.`,    address: 'Adresse',   phone: 'Téléphone', website: 'Site',    more: (c) => `Plus à ${c}`,            allCityVenues: (c) => `Tous les lieux de ${c} →`,         noPhotoYet: 'Pas encore de photo — exploitant ?',              claimAndUpload: 'Revendiquer & téléverser' },
  it: { claim: 'Rivendica il locale',   metaTitle: (v, c) => `${v} — ${c}`,  metaDescription: (v, c) => `${v} a ${c}.`,    address: 'Indirizzo', phone: 'Telefono',  website: 'Sito',    more: (c) => `Altri locali a ${c}`,    allCityVenues: (c) => `Tutti i locali di ${c} →`,         noPhotoYet: 'Ancora nessuna foto — proprietario?',             claimAndUpload: 'Rivendica & carica' },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; city: string; bucket: string; venue: string }>;
}): Promise<Metadata> {
  const { locale, city, bucket, venue } = await params;
  if (!isLocale(locale)) return {};
  const v = getVenueByCityArea(city, bucket, venue, locale);
  if (!v) return {};
  const t = COPY[locale];
  const paths: Partial<Record<Locale, string>> = {};
  for (const l of LOCALES) paths[l] = `/${l}/greece/${city}/${bucket}/${venue}`;
  const heroUrl = v.photos[0]?.url ?? null;
  return publicMetadata({
    locale,
    paths,
    title: t.metaTitle(v.name, v.cityName),
    description: (v.description ?? t.metaDescription(v.name, v.cityName)).slice(0, 160),
    ogImage: heroUrl,
    // Venue pages are essentially business profiles; Next's OG type union
    // doesn't expose 'business.business' so we use the closest accepted type.
    ogType: 'website',
  });
}

export default async function VenuePage({
  params,
}: {
  params: Promise<{ locale: string; city: string; bucket: string; venue: string }>;
}) {
  const { locale, city, bucket, venue } = await params;
  if (!isLocale(locale)) notFound();
  const v = getVenueByCityArea(city, bucket, venue, locale);
  if (!v) notFound();

  const photos = v.photos as { id: string; url: string; attribution: string | null }[];
  const hero = photos[0];
  const gallery = photos.slice(1); // remaining photos shown in the strip below hero
  const claimed = v.claim === 'verified';
  const t = COPY[locale];

  const cityId = getCityIdBySlug(city);
  const categoryId = getCategoryIdBySlug(v.categorySlug as string | null);
  const related = cityId
    ? listRelatedVenues({ cityId, excludeVenueId: v.id as string, categoryId, locale, limit: 6 })
    : [];

  const upcomingEvents = listUpcomingVenueEvents(v.id as string, 6);
  const upcomingHeading: Record<Locale, string> = {
    en: 'Upcoming events', el: 'Επερχόμενα events',
    de: 'Kommende Events', fr: 'Événements à venir', it: 'Prossimi eventi',
  };

  const venuePath = `/${locale}/greece/${city}/${bucket}/${venue}`;
  const homeLabel: Record<Locale, string> = { en: 'Home', el: 'Αρχική', de: 'Start', fr: 'Accueil', it: 'Home' };
  const greeceLabel: Record<Locale, string> = { en: 'Greece', el: 'Ελλάδα', de: 'Griechenland', fr: 'Grèce', it: 'Grecia' };

  // H2 section labels for the content-layer pass — each render-block gets
  // a proper heading so the page reads as a structured article (Google +
  // accessibility both benefit).
  const SECTION_COPY: Record<Locale, { overview: string; hours: string; location: string; similar: string; faq: string }> = {
    en: { overview: 'Overview',        hours: 'Hours',     location: 'Location',  similar: 'Similar venues',  faq: 'Common questions' },
    el: { overview: 'Επισκόπηση',      hours: 'Ώρες',      location: 'Τοποθεσία', similar: 'Παρόμοια μαγαζιά', faq: 'Συχνές ερωτήσεις' },
    de: { overview: 'Übersicht',       hours: 'Öffnungszeiten', location: 'Lage', similar: 'Ähnliche Locations', faq: 'Häufige Fragen' },
    fr: { overview: 'Aperçu',          hours: 'Horaires',  location: 'Emplacement', similar: 'Lieux similaires', faq: 'Questions fréquentes' },
    it: { overview: 'Panoramica',      hours: 'Orari',     location: 'Posizione', similar: 'Locali simili',  faq: 'Domande frequenti' },
  };
  const sect = SECTION_COPY[locale];

  // FAQ generator — facts only, never invented. The Q&A set is keyed by the
  // venue's real data (city, category, hours-presence, claim state) so the
  // page surfaces useful answers without making anything up. FAQPage schema
  // gets the same 4 items.
  const faqs = buildVenueFaqs(locale, {
    name: v.name,
    cityName: v.cityName,
    categoryName: v.categoryName,
    address: v.address,
    hasHours: !!v.openingHours,
    phone: v.phone,
    isClaimed: claimed,
  });

  return (
    <article className="mx-auto w-full max-w-5xl px-6 py-10">
      {/* JSON-LD: LocalBusiness (typed by category) + Breadcrumb */}
      <script
        type="application/ld+json"
        {...jsonLdProps([
          breadcrumbJsonLd([
            { name: homeLabel[locale], path: `/${locale}` },
            { name: greeceLabel[locale], path: `/${locale}/greece` },
            { name: v.cityName, path: `/${locale}/greece/${city}` },
            { name: v.areaName ?? v.categoryName ?? bucket, path: `/${locale}/greece/${city}/${bucket}` },
            { name: v.name, path: venuePath },
          ]),
          localBusinessJsonLd({
            locale,
            path: venuePath,
            name: v.name,
            description: v.description,
            address: v.address,
            cityName: v.cityName,
            phone: v.phone,
            website: v.website,
            lat: v.lat,
            lng: v.lng,
            rating: v.rating,
            reviewCount: v.reviewCount,
            priceLevel: v.priceLevel,
            openingHours: v.openingHours,
            photos: v.photos.map((p) => ({ url: p.url })),
            categorySlug: v.categorySlug,
          }),
          // FAQPage schema mirrors the visible FAQ block.
          faqJsonLd(faqs),
        ])}
      />

      <ViewTracker venueId={v.id} />

      <nav className="text-xs text-[var(--color-fg-2)]">
        <Link href={`/${locale}/greece/${city}`} className="hover:text-[var(--color-accent-cyan)]">{v.cityName as string}</Link>
        {' · '}
        <Link href={`/${locale}/greece/${city}/${bucket}`} className="hover:text-[var(--color-accent-cyan)]">{(v.areaName ?? v.categoryName) as string}</Link>
      </nav>

      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-6xl">{v.name as string}</h1>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--color-fg-2)]">
        {v.categoryName ? <span>{v.categoryName as string}</span> : null}
        {v.rating ? <span>· ★ {(v.rating as number).toFixed(1)}</span> : null}
        {!claimed && (
          <Link
            href={`/${locale}/claim/${v.id as string}`}
            className="ml-2 rounded-full border border-[var(--color-accent-pink)] px-3 py-0.5 text-xs text-[var(--color-accent-pink)] hover:bg-[var(--color-accent-pink)] hover:text-[var(--color-bg-0)]"
          >
            {t.claim}
          </Link>
        )}
      </div>

      {hero ? (
        <>
          <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-lg">
            {/* `city-hero-crop` clips the bottom ~3.5% to hide any photographer
                watermark that might exist in the source image. */}
            <Image src={hero.url} alt={v.name as string} fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover city-hero-crop" priority fetchPriority="high" />
          </div>
          {hero.attribution && (
            <p className="mt-2 text-[10px] text-[var(--color-fg-3)]">
              Photo · {hero.attribution}
            </p>
          )}
        </>
      ) : (
        <div className="mt-6 flex aspect-[16/9] w-full items-center justify-center rounded-lg bg-[var(--color-bg-1)] text-sm text-[var(--color-fg-3)]">
          {t.noPhotoYet}{' '}
          <Link href={`/${locale}/claim/${v.id as string}`} className="ml-2 text-[var(--color-accent-pink)]">{t.claimAndUpload}</Link>
        </div>
      )}

      {/* Upcoming events — Featured-tier owners can post these from the
          dashboard. Renders only when at least one upcoming event exists. */}
      {upcomingEvents.length > 0 && (
        <section className="mt-6 rounded-xl border border-[var(--color-accent-pink)]/30 bg-[var(--color-bg-1)] p-4" aria-label={upcomingHeading[locale]}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent-pink)]">
            {upcomingHeading[locale]}
          </p>
          <ul className="mt-3 divide-y divide-[var(--color-bg-2)]">
            {upcomingEvents.map((ev) => (
              <li key={ev.id} className="py-3">
                <p className="font-semibold text-[var(--color-fg-0)]">{ev.title}</p>
                <p className="text-xs text-[var(--color-fg-2)]">
                  {new Date(ev.startsAt * 1000).toLocaleString(locale, {
                    weekday: 'short', day: 'numeric', month: 'short',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                {ev.description && (
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-fg-1)]">{ev.description}</p>
                )}
                {ev.url && (
                  <a href={ev.url} rel="nofollow noopener" target="_blank" className="mt-1 inline-block text-xs text-[var(--color-accent-cyan)] hover:underline">
                    {ev.url.replace(/^https?:\/\//, '').slice(0, 60)} →
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Photo gallery — remaining photos in a tight grid below the hero.
          Sourced from Places API (§9 stage 3) so subjectType='venue' + source='google_places'.
          Same `city-hero-crop` mask applied to clip any bottom watermark. */}
      {gallery.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {gallery.map((p) => (
            <li key={p.id} className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image src={p.url} alt={v.name as string} fill sizes="(min-width:1024px) 20vw, (min-width:640px) 33vw, 50vw" loading="lazy" decoding="async" className="object-cover transition hover:scale-105 city-hero-crop" />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 grid gap-10 md:grid-cols-3">
        <div className="md:col-span-2">
          {/* Overview — the AI-written description, framed as a section. */}
          {v.description ? (
            <section aria-labelledby="overview-h2">
              <h2 id="overview-h2" className="font-display text-xl font-semibold tracking-tight md:text-2xl">{sect.overview}</h2>
              <p className="mt-3 text-lg leading-relaxed text-[var(--color-fg-1)]">{v.description as string}</p>
            </section>
          ) : null}

          {/* Hours — facts only, rendered from venues.opening_hours JSON
              (Google Places source). Hidden when we have no hours data;
              never invented. */}
          {v.openingHours && (
            <section className="mt-10" aria-labelledby="hours-h2">
              <h2 id="hours-h2" className="font-display text-xl font-semibold tracking-tight md:text-2xl">{sect.hours}</h2>
              <div className="mt-3">
                <HoursTable raw={v.openingHours as string | null} locale={locale} />
              </div>
            </section>
          )}

          <div className="mt-10">
            <AffiliateBlock venueId={v.id as string} locale={locale} />
          </div>

          <div className="mt-10">
            <AdSlot id={`venue-${v.id as string}-mid`} scope="section" />
          </div>
        </div>

        <aside aria-labelledby="location-h2" className="space-y-4 text-sm">
          <h2 id="location-h2" className="font-display text-xl font-semibold tracking-tight md:text-2xl">{sect.location}</h2>
          {v.address ? (
            <Row label={t.address} value={v.address as string} />
          ) : null}
          {v.phone ? (
            <Row label={t.phone} value={<a href={`tel:${(v.phone as string).replace(/\s/g, '')}`} className="text-[var(--color-accent-cyan)]">{v.phone as string}</a>} />
          ) : null}
          {v.website ? (
            <Row
              label={t.website}
              value={
                <a
                  href={v.website as string}
                  target="_blank"
                  rel="nofollow noopener"
                  className="break-all text-[var(--color-accent-cyan)]"
                >
                  {(v.website as string).replace(/^https?:\/\//, '')}
                </a>
              }
            />
          ) : null}

          <LazyMap
            lat={v.lat as number | null}
            lng={v.lng as number | null}
            name={v.name as string}
            locale={locale}
          />
        </aside>
      </div>

      {/* FAQ — Q&A driven by venue facts (city, category, hours-presence,
          phone-presence, claim state). Mirrored by FAQPage JSON-LD up top. */}
      <section className="mt-16 border-t border-[var(--color-bg-2)] pt-12" aria-labelledby="faq-h2">
        <h2 id="faq-h2" className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{sect.faq}</h2>
        <dl className="mt-6 divide-y divide-[var(--color-bg-2)]">
          {faqs.map((f) => (
            <div key={f.q} className="py-4">
              <dt className="font-semibold text-[var(--color-fg-0)]">{f.q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-[var(--color-fg-1)]">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {related.length > 0 && (
        <section className="mt-16 border-t border-[var(--color-bg-2)] pt-12" aria-labelledby="similar-h2">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="similar-h2" className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {sect.similar}
            </h2>
            <Link href={`/${locale}/greece/${city}`} className="text-sm text-[var(--color-accent-cyan)] hover:underline">
              {t.allCityVenues(v.cityName as string)}
            </Link>
          </div>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((rv) => (
              <li key={rv.id}><VenueCard venue={rv} locale={locale} /></li>
            ))}
          </ul>
        </section>
      )}

    </article>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-[var(--color-fg-2)]">{label}</p>
      <p className="mt-1 text-[var(--color-fg-0)]">{value}</p>
    </div>
  );
}

// FAQ generator. Strictly fact-driven — never invents hours, prices, or
// names. Every answer is derived from data we already trust (Places + owner
// edits + claim state). Returns 3–5 items depending on what facts exist.
function buildVenueFaqs(locale: Locale, v: {
  name: string;
  cityName: string;
  categoryName: string | null;
  address: string | null;
  hasHours: boolean;
  phone: string | null;
  isClaimed: boolean;
}): { q: string; a: string }[] {
  const C = {
    en: {
      whereQ: (n: string, c: string) => `Where is ${n}?`,
      whereA: (n: string, c: string, addr: string | null) =>
        addr ? `${n} is at ${addr}, ${c}.` : `${n} is in ${c}.`,
      hoursQ: (n: string) => `What are ${n}'s opening hours?`,
      hoursA: (n: string) => `${n}'s opening hours are listed above in the Hours section — sourced from Google and refreshed weekly.`,
      hoursNoA: (n: string) => `We don't have confirmed opening hours for ${n} yet. The owner can publish them from the dashboard.`,
      phoneQ: (n: string) => `Can I call ${n} to book?`,
      phoneA: (n: string, p: string) => `Yes — ${n}'s phone is ${p}.`,
      phoneNoA: (n: string) => `No phone number is listed for ${n}. Try the website or visit in person.`,
      typeQ: (n: string, c: string, cat: string) => `What kind of venue is ${n}?`,
      typeA: (n: string, c: string, cat: string) => `${n} is a ${cat.toLowerCase()} in ${c}.`,
      claimQ: (n: string) => `Is ${n} run by its owner on citynight?`,
      claimY: (n: string) => `Yes — the page is claimed by the venue's owner, so the details here are owner-verified.`,
      claimN: (n: string) => `Not yet — this page is unclaimed. If you run ${n}, you can claim it for free and start editing within minutes.`,
    },
    el: {
      whereQ: (n: string, c: string) => `Πού βρίσκεται το ${n};`,
      whereA: (n: string, c: string, addr: string | null) =>
        addr ? `Το ${n} βρίσκεται στη διεύθυνση ${addr}, ${c}.` : `Το ${n} βρίσκεται στην ${c}.`,
      hoursQ: (n: string) => `Ποιες είναι οι ώρες λειτουργίας του ${n};`,
      hoursA: (n: string) => `Οι ώρες λειτουργίας του ${n} φαίνονται παραπάνω στην ενότητα Ώρες — πηγή Google, ανανέωση εβδομαδιαία.`,
      hoursNoA: (n: string) => `Δεν έχουμε ακόμα επιβεβαιωμένες ώρες λειτουργίας για το ${n}. Ο ιδιοκτήτης μπορεί να τις δημοσιεύσει από το dashboard.`,
      phoneQ: (n: string) => `Μπορώ να καλέσω το ${n} για κράτηση;`,
      phoneA: (n: string, p: string) => `Ναι — το τηλέφωνο του ${n} είναι ${p}.`,
      phoneNoA: (n: string) => `Δεν υπάρχει τηλέφωνο για το ${n}. Δοκίμασε το website ή πέρασε από εκεί.`,
      typeQ: (n: string, c: string, cat: string) => `Τι τύπος μαγαζιού είναι το ${n};`,
      typeA: (n: string, c: string, cat: string) => `Το ${n} είναι ${cat.toLowerCase()} στην ${c}.`,
      claimQ: (n: string) => `Διαχειρίζεται ο ιδιοκτήτης το ${n} στο citynight;`,
      claimY: (n: string) => `Ναι — η σελίδα είναι claimed από τον ιδιοκτήτη και οι πληροφορίες είναι owner-verified.`,
      claimN: (n: string) => `Όχι ακόμα — η σελίδα είναι unclaimed. Αν είσαι ο ιδιοκτήτης του ${n}, μπορείς να την κάνεις claim δωρεάν και να επεξεργαστείς τις πληροφορίες σε λίγα λεπτά.`,
    },
    de: {
      whereQ: (n: string, c: string) => `Wo befindet sich ${n}?`,
      whereA: (n: string, c: string, addr: string | null) =>
        addr ? `${n} liegt an der Adresse ${addr}, ${c}.` : `${n} liegt in ${c}.`,
      hoursQ: (n: string) => `Wie sind die Öffnungszeiten von ${n}?`,
      hoursA: (n: string) => `Die Öffnungszeiten von ${n} stehen oben im Abschnitt Öffnungszeiten — Quelle Google, wöchentlich aktualisiert.`,
      hoursNoA: (n: string) => `Wir haben noch keine bestätigten Öffnungszeiten für ${n}. Der Inhaber kann sie über das Dashboard veröffentlichen.`,
      phoneQ: (n: string) => `Kann ich ${n} anrufen, um zu reservieren?`,
      phoneA: (n: string, p: string) => `Ja — die Telefonnummer von ${n} ist ${p}.`,
      phoneNoA: (n: string) => `Keine Telefonnummer für ${n} hinterlegt. Versuche die Website oder gehe direkt vorbei.`,
      typeQ: (n: string, c: string, cat: string) => `Welche Art von Location ist ${n}?`,
      typeA: (n: string, c: string, cat: string) => `${n} ist ${cat} in ${c}.`,
      claimQ: (n: string) => `Wird ${n} vom Inhaber auf citynight betreut?`,
      claimY: (n: string) => `Ja — die Seite ist vom Inhaber beansprucht; die Angaben hier sind inhaberverifiziert.`,
      claimN: (n: string) => `Noch nicht — die Seite ist nicht beansprucht. Wenn du ${n} betreibst, kannst du sie kostenlos übernehmen und in Minuten bearbeiten.`,
    },
    fr: {
      whereQ: (n: string, c: string) => `Où se trouve ${n} ?`,
      whereA: (n: string, c: string, addr: string | null) =>
        addr ? `${n} se trouve au ${addr}, ${c}.` : `${n} se trouve à ${c}.`,
      hoursQ: (n: string) => `Quels sont les horaires de ${n} ?`,
      hoursA: (n: string) => `Les horaires de ${n} apparaissent ci-dessus dans la section Horaires — source Google, actualisé chaque semaine.`,
      hoursNoA: (n: string) => `Nous n'avons pas encore d'horaires confirmés pour ${n}. L'exploitant peut les publier depuis le dashboard.`,
      phoneQ: (n: string) => `Puis-je appeler ${n} pour réserver ?`,
      phoneA: (n: string, p: string) => `Oui — le numéro de ${n} est ${p}.`,
      phoneNoA: (n: string) => `Aucun numéro n'est listé pour ${n}. Essayez le site ou passez sur place.`,
      typeQ: (n: string, c: string, cat: string) => `Quel type de lieu est ${n} ?`,
      typeA: (n: string, c: string, cat: string) => `${n} est ${cat.toLowerCase()} à ${c}.`,
      claimQ: (n: string) => `${n} est-il géré par son exploitant sur citynight ?`,
      claimY: (n: string) => `Oui — la page est revendiquée par l'exploitant ; les infos sont vérifiées par lui.`,
      claimN: (n: string) => `Pas encore — la page n'est pas revendiquée. Si vous gérez ${n}, vous pouvez la revendiquer gratuitement.`,
    },
    it: {
      whereQ: (n: string, c: string) => `Dove si trova ${n}?`,
      whereA: (n: string, c: string, addr: string | null) =>
        addr ? `${n} si trova in ${addr}, ${c}.` : `${n} si trova a ${c}.`,
      hoursQ: (n: string) => `Quali sono gli orari di ${n}?`,
      hoursA: (n: string) => `Gli orari di ${n} sono qui sopra nella sezione Orari — fonte Google, aggiornati settimanalmente.`,
      hoursNoA: (n: string) => `Non abbiamo ancora orari confermati per ${n}. Il proprietario può pubblicarli dal dashboard.`,
      phoneQ: (n: string) => `Posso chiamare ${n} per prenotare?`,
      phoneA: (n: string, p: string) => `Sì — il telefono di ${n} è ${p}.`,
      phoneNoA: (n: string) => `Nessun numero per ${n}. Prova il sito o passa di persona.`,
      typeQ: (n: string, c: string, cat: string) => `Che tipo di locale è ${n}?`,
      typeA: (n: string, c: string, cat: string) => `${n} è ${cat.toLowerCase()} a ${c}.`,
      claimQ: (n: string) => `${n} è gestito dal proprietario su citynight?`,
      claimY: (n: string) => `Sì — la pagina è rivendicata dal proprietario; le info qui sono verificate.`,
      claimN: (n: string) => `Non ancora — la pagina non è rivendicata. Se gestisci ${n}, puoi rivendicarla gratis in pochi minuti.`,
    },
  }[locale];

  const out: { q: string; a: string }[] = [];
  out.push({ q: C.whereQ(v.name, v.cityName), a: C.whereA(v.name, v.cityName, v.address) });
  out.push({
    q: C.hoursQ(v.name),
    a: v.hasHours ? C.hoursA(v.name) : C.hoursNoA(v.name),
  });
  if (v.categoryName) {
    out.push({ q: C.typeQ(v.name, v.cityName, v.categoryName), a: C.typeA(v.name, v.cityName, v.categoryName) });
  }
  out.push({
    q: C.phoneQ(v.name),
    a: v.phone ? C.phoneA(v.name, v.phone) : C.phoneNoA(v.name),
  });
  out.push({ q: C.claimQ(v.name), a: v.isClaimed ? C.claimY(v.name) : C.claimN(v.name) });
  return out;
}

// Render Google Places `opening_hours` JSON as a per-day table. Trusted
// because the source is Places (a fact source), never AI.
function HoursTable({ raw, locale }: { raw: string | null; locale: Locale }) {
  if (!raw) return null;
  let parsed: { periods?: Array<{ open?: { day?: number; hour?: number; minute?: number }; close?: { day?: number; hour?: number; minute?: number } }> };
  try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  const periods = parsed?.periods ?? [];
  if (!Array.isArray(periods) || !periods.length) return null;

  // ISO 8601: Monday = 0 in our table even though Places uses Sunday=0; we
  // remap so the table reads Mon→Sun, which is the more common European
  // mental model for opening hours.
  const PLACES_TO_LOCAL = [6, 0, 1, 2, 3, 4, 5]; // Places' Sunday=0 → row 6
  const DAY_NAMES: Record<Locale, string[]> = {
    en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    el: ['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'],
    de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
    fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    it: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
  };

  const rows: { day: string; opens: string; closes: string }[] = Array.from({ length: 7 }, (_, i) => ({
    day: DAY_NAMES[locale][i]!, opens: '', closes: '',
  }));
  const pad = (n: number) => String(n).padStart(2, '0');
  for (const p of periods) {
    if (typeof p?.open?.day !== 'number') continue;
    const idx = PLACES_TO_LOCAL[p.open.day];
    if (idx === undefined) continue;
    rows[idx]!.opens = `${pad(p.open.hour ?? 0)}:${pad(p.open.minute ?? 0)}`;
    if (typeof p.close?.day === 'number') {
      rows[idx]!.closes = `${pad(p.close.hour ?? 0)}:${pad(p.close.minute ?? 0)}`;
    }
  }

  const closedLabel: Record<Locale, string> = {
    en: 'Closed', el: 'Κλειστά', de: 'Geschlossen', fr: 'Fermé', it: 'Chiuso',
  };

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
      {rows.map((r) => (
        <div key={r.day} className="flex items-baseline justify-between gap-3 border-b border-[var(--color-bg-2)] py-1.5">
          <dt className="font-semibold text-[var(--color-fg-1)]">{r.day}</dt>
          <dd className="text-[var(--color-fg-0)]">
            {r.opens ? `${r.opens} – ${r.closes || '?'}` : closedLabel[locale]}
          </dd>
        </div>
      ))}
    </dl>
  );
}

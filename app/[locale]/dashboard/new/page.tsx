import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth/session';
import { listPublishedCities, listCategories } from '@/lib/queries';
import { privateMetadata } from '@/lib/seo';
import { SubmitNewVenueForm } from '@/components/submit-new-venue-form';

// Phase 5: self-serve "submit a new venue" page (§12).
// The form posts to /api/venues/submit which auto-validates against Google
// Places — high confidence + recent reviews → auto-publish; lower → 'pending';
// no match → 'rejected'. Owner is automatically attached + claim=verified
// because they're signed in.

export const dynamic = 'force-dynamic';
export const metadata: Metadata = privateMetadata({ title: 'Submit a new venue — citynight' });

const COPY: Record<Locale, {
  h1: string;
  sub: string;
  fName: string;
  fCity: string;
  fCategory: string;
  fNamePh: string;
  cityPh: string;
  catPh: string;
  hint: string;
}> = {
  en: {
    h1: 'Submit a new venue',
    sub: 'We will cross-check it against Google Places before publishing. If it matches a real, recently-reviewed business, it goes live within seconds — otherwise it waits for review.',
    fName: 'Venue name',
    fCity: 'City',
    fCategory: 'Category',
    fNamePh: 'e.g. Six DOGS',
    cityPh: 'Pick a city…',
    catPh: 'Pick a category…',
    hint: 'Tip: use the same spelling as on Google Maps for the best match rate.',
  },
  el: {
    h1: 'Πρόσθεσε νέο μαγαζί',
    sub: 'Θα το επιβεβαιώσουμε στο Google Places πριν δημοσιευτεί. Αν ταιριάζει με πραγματικό, πρόσφατα αξιολογημένο μαγαζί, βγαίνει live σε δευτερόλεπτα — αλλιώς πάει για έλεγχο.',
    fName: 'Όνομα μαγαζιού',
    fCity: 'Πόλη',
    fCategory: 'Κατηγορία',
    fNamePh: 'π.χ. Six DOGS',
    cityPh: 'Διάλεξε πόλη…',
    catPh: 'Διάλεξε κατηγορία…',
    hint: 'Συμβουλή: χρησιμοποίησε την ίδια ορθογραφία με το Google Maps για καλύτερο matching.',
  },
  de: {
    h1: 'Neue Location einreichen',
    sub: 'Wir prüfen sie gegen Google Places, bevor sie veröffentlicht wird. Echte, kürzlich bewertete Betriebe gehen sofort live — sonst Wartezimmer.',
    fName: 'Name der Location',
    fCity: 'Stadt',
    fCategory: 'Kategorie',
    fNamePh: 'z. B. Six DOGS',
    cityPh: 'Stadt wählen…',
    catPh: 'Kategorie wählen…',
    hint: 'Tipp: gleiche Schreibweise wie auf Google Maps.',
  },
  fr: {
    h1: 'Soumettre un nouveau lieu',
    sub: 'Nous le vérifions sur Google Places avant publication. Un lieu réel récemment évalué passe en ligne immédiatement — sinon il attend la revue.',
    fName: 'Nom du lieu',
    fCity: 'Ville',
    fCategory: 'Catégorie',
    fNamePh: 'p. ex. Six DOGS',
    cityPh: 'Choisir une ville…',
    catPh: 'Choisir une catégorie…',
    hint: 'Astuce : utilisez la même orthographe que sur Google Maps.',
  },
  it: {
    h1: 'Invia un nuovo locale',
    sub: 'Verifichiamo su Google Places prima di pubblicare. Un locale reale con recensioni recenti va live in pochi secondi — altrimenti attende la revisione.',
    fName: 'Nome del locale',
    fCity: 'Città',
    fCategory: 'Categoria',
    fNamePh: 'es. Six DOGS',
    cityPh: 'Scegli una città…',
    catPh: 'Scegli una categoria…',
    hint: 'Suggerimento: usa la stessa ortografia di Google Maps.',
  },
};

export default async function NewVenuePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect('/en/sign-in');
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/sign-in`);

  const cities = listPublishedCities(locale);
  const categories = listCategories(locale);
  const c = COPY[locale];

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{c.h1}</h1>
      <p className="mt-3 text-[var(--color-fg-1)]">{c.sub}</p>

      <div className="mt-8">
        <SubmitNewVenueForm
          locale={locale}
          cities={cities.map((cc) => ({ slug: cc.slug, name: cc.name, region: cc.region }))}
          categories={categories.map((k) => ({ slug: k.slug, name: k.name }))}
          copy={{
            fName: c.fName, fCity: c.fCity, fCategory: c.fCategory,
            fNamePh: c.fNamePh, cityPh: c.cityPh, catPh: c.catPh,
            hint: c.hint,
          }}
        />
      </div>
    </section>
  );
}

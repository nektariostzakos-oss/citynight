import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import { getCityBySlug, getCategoryBySlug, listAreasInCity, listVenuesForCity } from '@/lib/queries';
import { VenueCard } from '@/components/venue-card';
import { AdSlot } from '@/components/ad-slot';
import { publicMetadata } from '@/lib/seo';

export const revalidate = 1800;

// The 3rd segment is either an area slug or a category slug. We resolve in that order
// so genuine areas win — categories are global and stable, areas are city-scoped.
async function resolveBucket(citySlug: string, bucketSlug: string, locale: Locale) {
  const city = getCityBySlug(citySlug, locale);
  if (!city) return null;
  const area = listAreasInCity(city.id, locale).find((a) => a.slug === bucketSlug);
  if (area) return { kind: 'area' as const, city, area };
  const cat = getCategoryBySlug(bucketSlug, locale);
  if (cat) return { kind: 'category' as const, city, category: cat };
  return null;
}

const BUCKET_COPY: Record<Locale, {
  titleArea: (label: string, city: string) => string;
  titleCategory: (label: string, city: string) => string;
  descriptionArea: (label: string, city: string) => string;
  descriptionCategory: (label: string, city: string) => string;
  h1Category: (label: string, city: string) => string;
  noVenues: (label: string) => string;
}> = {
  en: { titleArea: (l, c) => `${l} nightlife — ${c}`, titleCategory: (l, c) => `${l} in ${c}`, descriptionArea: (l, c) => `Best ${l.toLowerCase()} in ${c}.`, descriptionCategory: (l, c) => `Best ${l.toLowerCase()} across ${c}.`, h1Category: (l, c) => `${l} in ${c}`, noVenues: (l) => `No published venues yet for ${l}.` },
  el: { titleArea: (l, c) => `${l} νυχτερινή ζωή — ${c}`, titleCategory: (l, c) => `${l} στην ${c}`, descriptionArea: (l, c) => `Τα κορυφαία ${l.toLowerCase()} στην ${c}.`, descriptionCategory: (l, c) => `Τα κορυφαία ${l.toLowerCase()} σε όλη την ${c}.`, h1Category: (l, c) => `${l} στην ${c}`, noVenues: (l) => `Δεν υπάρχουν ακόμη δημοσιευμένα μαγαζιά για ${l}.` },
  de: { titleArea: (l, c) => `${l} Nightlife — ${c}`, titleCategory: (l, c) => `${l} in ${c}`, descriptionArea: (l, c) => `Beste ${l} in ${c}.`, descriptionCategory: (l, c) => `Beste ${l} in ${c}.`, h1Category: (l, c) => `${l} in ${c}`, noVenues: (l) => `Noch keine veröffentlichten Locations für ${l}.` },
  fr: { titleArea: (l, c) => `${l} vie nocturne — ${c}`, titleCategory: (l, c) => `${l} à ${c}`, descriptionArea: (l, c) => `Les meilleurs ${l.toLowerCase()} à ${c}.`, descriptionCategory: (l, c) => `Les meilleurs ${l.toLowerCase()} à ${c}.`, h1Category: (l, c) => `${l} à ${c}`, noVenues: (l) => `Aucun lieu publié pour ${l}.` },
  it: { titleArea: (l, c) => `${l} vita notturna — ${c}`, titleCategory: (l, c) => `${l} a ${c}`, descriptionArea: (l, c) => `I migliori ${l.toLowerCase()} a ${c}.`, descriptionCategory: (l, c) => `I migliori ${l.toLowerCase()} a ${c}.`, h1Category: (l, c) => `${l} a ${c}`, noVenues: (l) => `Nessun locale pubblicato per ${l}.` },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string; city: string; bucket: string }> }): Promise<Metadata> {
  const { locale, city, bucket } = await params;
  if (!isLocale(locale)) return {};
  const r = await resolveBucket(city, bucket, locale);
  if (!r) return {};
  const label = r.kind === 'area' ? r.area.name : r.category.name;
  const t = BUCKET_COPY[locale];
  const paths: Partial<Record<Locale, string>> = {};
  for (const l of LOCALES) paths[l] = `/${l}/greece/${city}/${bucket}`;
  return publicMetadata({
    locale,
    paths,
    title: r.kind === 'area' ? t.titleArea(label, r.city.name) : t.titleCategory(label, r.city.name),
    description: r.kind === 'area' ? t.descriptionArea(label, r.city.name) : t.descriptionCategory(label, r.city.name),
  });
}

export default async function BucketPage({ params }: { params: Promise<{ locale: string; city: string; bucket: string }> }) {
  const { locale, city, bucket } = await params;
  if (!isLocale(locale)) notFound();
  const r = await resolveBucket(city, bucket, locale);
  if (!r) notFound();

  const venues = r.kind === 'category'
    ? listVenuesForCity(r.city.id, locale, { categoryId: r.category.id, limit: 80 })
    : listVenuesForCity(r.city.id, locale, { limit: 80 }).filter((v) => v.areaId === r.area.id);

  const label = r.kind === 'area' ? r.area.name : r.category.name;
  const t = BUCKET_COPY[locale];

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12">
      <p className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{r.city.name}</p>
      <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight md:text-5xl">
        {r.kind === 'area' ? `${label}` : t.h1Category(label, r.city.name)}
      </h1>

      <div className="my-10">
        <AdSlot id={`bucket-${city}-${bucket}-top`} scope="section" />
      </div>

      {venues.length === 0 ? (
        <p className="text-[var(--color-fg-2)]">{t.noVenues(label)}</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((v) => (
            <li key={v.id}>
              <VenueCard venue={v} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

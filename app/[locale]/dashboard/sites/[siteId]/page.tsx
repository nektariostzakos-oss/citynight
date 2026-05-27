// SaaS site dashboard — single tenant. Auth-gated + ownership-checked.
// Lays out every editor needed to manage the customer's website.

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/db';
import { privateMetadata } from '@/lib/seo';
import { getSiteMenu } from '@/lib/site-queries';
import { listSitePhotos } from '@/lib/owner-site-photos';
import { MAX_PHOTOS_PER_VENUE } from '@/lib/uploads';

import { SiteInfoEditor, type SiteInfoLabels } from '@/components/site-info-editor';
import { SiteBillingButton } from '@/components/site-billing-button';
import { SiteUpgradeButton } from '@/components/site-upgrade-button';
import { VenueAboutEditor, type VenueAboutEditorLabels } from '@/components/venue-about-editor';
import { VenueReservationEditor, type VenueReservationEditorLabels } from '@/components/venue-reservation-editor';
import { VenueMenuEditor, type VenueMenuEditorLabels, type MenuEditorSection } from '@/components/venue-menu-editor';
import { VenuePhotoUploader, type VenuePhotoUploaderLabels } from '@/components/venue-photo-uploader';
import { VenueDomainEditor, type VenueDomainEditorLabels } from '@/components/venue-domain-editor';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = privateMetadata({ title: 'Site dashboard — citynight' });

type SiteRow = Record<string, unknown>;

export default async function SiteDashboard({
  params, searchParams,
}: {
  params: Promise<{ locale: string; siteId: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { locale, siteId } = await params;
  const { welcome } = await searchParams;
  if (!isLocale(locale)) redirect('/el/sign-in');
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/dashboard/sites/${siteId}`)}`);

  const v = db.$client.prepare(`
    SELECT id, slug, city_slug AS citySlug, name, vertical, template_id AS templateId,
           city, country, address, phone, contact_email AS contactEmail,
           hours, about_text AS aboutText,
           reservation_url AS reservationUrl, reservation_email AS reservationEmail,
           reservation_phone AS reservationPhone, reservation_notes AS reservationNotes,
           wordmark, tagline,
           custom_domain AS customDomain,
           saas_status AS saasStatus, status,
           stripe_customer_id AS stripeCustomerId,
           zip_purchased_at AS zipPurchasedAt
      FROM sites WHERE id = ? AND owner_id = ?
  `).get(siteId, user.id) as SiteRow | undefined;
  if (!v) notFound();

  const photos = listSitePhotos(siteId);
  const menuForEditor: MenuEditorSection[] = getSiteMenu(siteId).map((s) => ({
    id: s.id, name: s.name, description: s.description ?? '',
    items: s.items.map((it) => ({
      id: it.id, name: it.name, description: it.description ?? '',
      price: it.price ?? '',
      isPopular: it.isPopular, isVegetarian: it.isVegetarian,
      isVegan: it.isVegan, isGlutenFree: it.isGlutenFree,
    })),
  }));

  // Public URL on the new tree. Sites without a city_slug fall back to a
  // non-public state (admin can fix from the business-info editor).
  const publicHref = v.citySlug
    ? `/${locale}/cities/${v.citySlug as string}/${v.slug as string}`
    : null;

  // Phase H4 — €19/mo subscription gates custom domain. €190 one-time
  // gates ZIP download. Neither blocks the free hosted site or its editors.
  const hasMonthlySubscription =
    !!v.stripeCustomerId && (v.saasStatus === 'active' || v.saasStatus === 'trialing');
  const t = LABELS[locale];

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-12">
      {welcome === '1' && (
        <div className="mb-8 rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 p-4">
          <p className="font-semibold text-[var(--color-fg-0)]">{t.welcome}</p>
          <p className="mt-1 text-sm text-[var(--color-fg-1)]">{t.welcomeBody(v.name as string)}</p>
        </div>
      )}

      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">
            {(v.city as string | null) ?? v.country as string} · {v.saasStatus as string}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{v.name as string}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {publicHref && (
            <Link href={publicHref} className="text-[var(--color-accent-cyan)] hover:underline">
              {t.viewSite} →
            </Link>
          )}
          {v.stripeCustomerId ? (
            <SiteBillingButton siteId={siteId} label={t.billing} busyLabel={t.billingOpening} />
          ) : null}
        </div>
      </header>

      <div className="mt-12 space-y-12">
        <SiteInfoEditor
          siteId={siteId}
          initial={{
            name: (v.name as string) ?? '',
            wordmark: (v.wordmark as string | null) ?? '',
            tagline: (v.tagline as string | null) ?? '',
            city: (v.city as string | null) ?? '',
            address: (v.address as string | null) ?? '',
            phone: (v.phone as string | null) ?? '',
            contactEmail: (v.contactEmail as string | null) ?? '',
          }}
          labels={t.info}
        />

        <div className="border-t border-[var(--color-bg-2)] pt-10">
          <VenueAboutEditor
            venueId={siteId}
            endpoint={`/api/sites/${siteId}/about`}
            initial={(v.aboutText as string | null) ?? ''}
            labels={t.about}
          />
        </div>

        <div className="border-t border-[var(--color-bg-2)] pt-10">
          <VenuePhotoUploader
            venueId={siteId}
            endpointBase={`/api/sites/${siteId}/photos`}
            initial={photos}
            max={MAX_PHOTOS_PER_VENUE}
            labels={t.photos}
          />
        </div>

        <div className="border-t border-[var(--color-bg-2)] pt-10">
          <VenueMenuEditor
            venueId={siteId}
            endpoint={`/api/sites/${siteId}/menu`}
            initial={menuForEditor}
            labels={t.menu}
          />
        </div>

        <div className="border-t border-[var(--color-bg-2)] pt-10">
          <VenueReservationEditor
            venueId={siteId}
            endpoint={`/api/sites/${siteId}/reservation`}
            initial={{
              reservationUrl: (v.reservationUrl as string | null) ?? '',
              reservationEmail: (v.reservationEmail as string | null) ?? '',
              reservationPhone: (v.reservationPhone as string | null) ?? '',
              reservationNotes: (v.reservationNotes as string | null) ?? '',
            }}
            labels={t.reservation}
          />
        </div>

        {/* Custom domain — gated on €19/mo subscription (Phase H4). */}
        <div className="border-t border-[var(--color-bg-2)] pt-10">
          {hasMonthlySubscription ? (
            <VenueDomainEditor
              venueId={siteId}
              endpoint={`/api/sites/${siteId}/domain`}
              initial={(v.customDomain as string | null) ?? ''}
              labels={t.domain}
            />
          ) : (
            <section>
              <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">
                {t.domain.heading}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-fg-2)]">{t.domain.body}</p>
              <div className="mt-5 rounded-lg border border-[var(--color-accent-pink)]/40 bg-[color-mix(in_oklab,var(--color-accent-pink)_6%,var(--color-bg-1))] p-5">
                <p className="font-display text-base font-semibold text-[var(--color-fg-0)]">
                  {t.upgradeDomainHeading}
                </p>
                <p className="mt-1 text-sm text-[var(--color-fg-1)]">{t.upgradeDomainBody}</p>
                <div className="mt-4">
                  <SiteUpgradeButton siteId={siteId} plan="monthly" label={t.upgradeDomainCta} busyLabel={t.upgradeBusy} locale={locale} />
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Atelier ZIP — gated on €190 one-time purchase (Phase H4). */}
        <div className="border-t border-[var(--color-bg-2)] pt-10">
          <section>
            <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">{t.zipHeading}</h2>
            <p className="mt-1 text-sm text-[var(--color-fg-2)]">{t.zipBody}</p>
            <div className="mt-5">
              {v.zipPurchasedAt ? (
                <a
                  href={`/api/atelier/download?site=${siteId}`}
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--color-bg-3)] px-4 py-2 text-sm font-semibold text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
                >
                  {t.zipDownload} ↓
                </a>
              ) : (
                <SiteUpgradeButton siteId={siteId} plan="zip" label={t.zipBuyCta} busyLabel={t.upgradeBusy} locale={locale} />
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

// ─── locale labels (compact — we reuse the venue editor types so labels
// match shape) ────────────────────────────────────────────────────────────

type DashboardLabels = {
  welcome: string;
  welcomeBody: (name: string) => string;
  viewSite: string;
  billing: string;
  billingOpening: string;
  info: SiteInfoLabels;
  about: VenueAboutEditorLabels;
  photos: VenuePhotoUploaderLabels;
  menu: VenueMenuEditorLabels;
  reservation: VenueReservationEditorLabels;
  domain: VenueDomainEditorLabels;
  upgradeDomainHeading: string;
  upgradeDomainBody: string;
  upgradeDomainCta: string;
  upgradeBusy: string;
  zipHeading: string;
  zipBody: string;
  zipBuyCta: string;
  zipDownload: string;
};

const EN_LABELS: DashboardLabels = {
  welcome: 'Welcome — your site is live.',
  welcomeBody: (n) => `${n} is online. Edit anything here — changes go live within seconds.`,
  viewSite: 'View site', billing: 'Manage billing', billingOpening: 'Opening…',
  info: {
    heading: 'Business info',
    body: 'Name, city, address, phone, email. Updates everywhere on the site.',
    name: 'Name', wordmark: 'Wordmark', wordmarkHint: 'How the logo wordmark appears (caps)',
    tagline: 'Tagline', taglineHint: 'Small line under the logo',
    city: 'City', address: 'Address', phone: 'Phone', email: 'Email',
    save: 'Save', saving: 'Saving…', saved: 'Saved.', error: 'Error.',
  },
  about: {
    heading: 'About', body: 'Your story. Plain text; paragraph breaks are kept.',
    placeholder: 'A neighbourhood bar that started in 2018…',
    save: 'Save', saving: 'Saving…', saved: 'Saved.', error: 'Error.',
    countTpl: '{n} chars',
  },
  photos: {
    heading: 'Gallery', body: 'Upload your own photos. Mark one as primary for the hero.',
    upload: 'Upload', uploading: 'Uploading…', remove: 'Remove',
    setPrimary: 'Set primary', primary: 'Primary', moveUp: 'Up', moveDown: 'Down',
    empty: 'No photos yet.', errorTooLarge: 'Too large (max 5 MB).', errorType: 'JPEG / PNG / WebP.',
    errorGeneric: 'Upload failed.', hint: 'JPEG / PNG / WebP · max 5 MB',
    maxNoticeTpl: '{n} photos max',
  },
  menu: {
    heading: 'Menu', body: 'Sections + items. Schema.org Menu for Google.',
    addSection: 'Add section', addItem: 'Add item',
    sectionName: 'Section name', sectionDesc: 'Intro (optional)',
    itemName: 'Name', itemDesc: 'Description', itemPrice: 'Price',
    remove: 'Remove', moveUp: 'Up', moveDown: 'Down',
    flagPopular: 'Popular', flagVegetarian: 'Vegetarian', flagVegan: 'Vegan', flagGlutenFree: 'Gluten-free',
    save: 'Save', saving: 'Saving…', saved: 'Saved.', error: 'Error.',
    emptyMenu: 'No menu — add a section.',
  },
  reservation: {
    heading: 'Reservations', body: 'How visitors book.',
    urlLabel: 'Booking URL', urlHint: 'OpenTable / other external page',
    emailLabel: 'Email', emailHint: 'Reservation requests from the form arrive here',
    phoneLabel: 'Phone', phoneHint: 'Optional — falls back to the public phone',
    notesLabel: 'Notes', notesHint: 'e.g. Reservations recommended for 6+',
    save: 'Save', saving: 'Saving…', saved: 'Saved.', error: 'Error.',
  },
  domain: {
    heading: 'Custom domain', body: 'Point your own domain at this site.',
    inputLabel: 'Domain', placeholder: 'mybusiness.gr',
    save: 'Save', saving: 'Saving…', saved: 'Saved.', remove: 'Remove', error: 'Error.',
    active: 'Active', inactive: 'Inactive',
    setupHeading: 'DNS setup',
    setupLine1Tpl: 'At your registrar: CNAME for {domain} → citynight.gr',
    setupLine2: 'In Cloudflare: add your domain, turn on orange-cloud proxy. SSL automatic.',
    setupLine3: 'After DNS propagation (10 min – 24 h), your domain serves this site.',
  },
  upgradeDomainHeading: 'Add your own domain · €19/month',
  upgradeDomainBody:
    'Point a .gr or .com you already own at this site. SSL is automatic, your customers see your brand in the URL, not citynight\'s. Cancel anytime.',
  upgradeDomainCta: 'Add domain (€19/mo)',
  upgradeBusy: 'Opening checkout…',
  zipHeading: 'Self-host (Atelier ZIP)',
  zipBody: 'Buy the full Next.js project pre-filled with your business info. Install on your own Hostinger; no monthly fee. €190 one-time.',
  zipBuyCta: 'Buy ZIP (€190)',
  zipDownload: 'Download ZIP',
};

const EL_LABELS: DashboardLabels = {
  welcome: 'Καλώς ήρθες — το site σου είναι έτοιμο.',
  welcomeBody: (n) => `Το ${n} είναι online. Επεξεργάσου από εδώ — αλλαγές πάνε live σε δευτερόλεπτα.`,
  viewSite: 'Δες το site', billing: 'Διαχείριση χρεώσεων', billingOpening: 'Άνοιγμα…',
  info: {
    heading: 'Στοιχεία επιχείρησης',
    body: 'Όνομα, πόλη, διεύθυνση, τηλέφωνο, email. Αλλαγές εμφανίζονται σε όλο το site.',
    name: 'Όνομα', wordmark: 'Wordmark', wordmarkHint: 'Πώς εμφανίζεται το λογότυπο (caps)',
    tagline: 'Tagline', taglineHint: 'Μικρή υπογραφή κάτω από το λογότυπο',
    city: 'Πόλη', address: 'Διεύθυνση', phone: 'Τηλέφωνο', email: 'Email',
    save: 'Αποθήκευση', saving: 'Αποθηκεύεται…', saved: 'Αποθηκεύτηκε.', error: 'Σφάλμα.',
  },
  about: {
    heading: 'Σχετικά', body: 'Η ιστορία σου. Απλό κείμενο, διατηρούνται οι παράγραφοι.',
    placeholder: 'Ένα μπαρ της γειτονιάς που ξεκίνησε το 2018…',
    save: 'Αποθήκευση', saving: 'Αποθηκεύεται…', saved: 'Αποθηκεύτηκε.', error: 'Σφάλμα.',
    countTpl: '{n} χαρακτήρες',
  },
  photos: {
    heading: 'Φωτογραφίες', body: 'Ανέβασε τις δικές σου. Όρισε κύρια για το hero.',
    upload: 'Ανέβασμα', uploading: 'Ανέβασμα…', remove: 'Διαγραφή',
    setPrimary: 'Κύρια', primary: 'Κύρια', moveUp: 'Πάνω', moveDown: 'Κάτω',
    empty: 'Καμία ακόμα — ανέβασε μία.',
    errorTooLarge: 'Πολύ μεγάλο (max 5 MB).', errorType: 'JPEG / PNG / WebP.', errorGeneric: 'Σφάλμα.',
    hint: 'JPEG / PNG / WebP · max 5 MB', maxNoticeTpl: 'έως {n} φωτογραφίες',
  },
  menu: {
    heading: 'Μενού', body: 'Οργάνωσε σε ενότητες. Schema.org Menu για Google.',
    addSection: 'Νέα ενότητα', addItem: 'Νέο στοιχείο',
    sectionName: 'Όνομα ενότητας', sectionDesc: 'Εισαγωγή (προαιρετικό)',
    itemName: 'Όνομα', itemDesc: 'Περιγραφή', itemPrice: 'Τιμή',
    remove: 'Διαγραφή', moveUp: 'Πάνω', moveDown: 'Κάτω',
    flagPopular: 'Δημοφιλές', flagVegetarian: 'Χορτοφαγικό', flagVegan: 'Vegan', flagGlutenFree: 'Χωρίς γλουτένη',
    save: 'Αποθήκευση', saving: 'Αποθηκεύεται…', saved: 'Αποθηκεύτηκε.', error: 'Σφάλμα.',
    emptyMenu: 'Κανένα μενού — πρόσθεσε ενότητα.',
  },
  reservation: {
    heading: 'Κρατήσεις', body: 'Πώς κάνουν κράτηση οι επισκέπτες.',
    urlLabel: 'Σύνδεσμος κράτησης', urlHint: 'OpenTable / άλλη εξωτερική σελίδα',
    emailLabel: 'Email κρατήσεων', emailHint: 'Εδώ στέλνουμε αιτήματα από τη φόρμα',
    phoneLabel: 'Τηλέφωνο κρατήσεων', phoneHint: 'Προαιρετικό — fallback στο δημόσιο τηλέφωνο',
    notesLabel: 'Σημειώσεις', notesHint: 'π.χ. Συνιστάται κράτηση για 6+',
    save: 'Αποθήκευση', saving: 'Αποθηκεύεται…', saved: 'Αποθηκεύτηκε.', error: 'Σφάλμα.',
  },
  domain: {
    heading: 'Custom domain', body: 'Δείξε το δικό σου domain σε αυτό το site.',
    inputLabel: 'Domain', placeholder: 'το-εστιατόριο.gr',
    save: 'Αποθήκευση', saving: 'Αποθηκεύεται…', saved: 'Αποθηκεύτηκε.', remove: 'Αφαίρεση', error: 'Σφάλμα.',
    active: 'Ενεργό', inactive: 'Ανενεργό',
    setupHeading: 'DNS setup',
    setupLine1Tpl: 'Στον registrar: CNAME για {domain} → citynight.gr',
    setupLine2: 'Στο Cloudflare: πρόσθεσε το domain, ενεργοποίησε orange-cloud proxy. SSL αυτόματο.',
    setupLine3: 'Μετά το propagation (10 min – 24 h), το domain σου δείχνει αυτό το site.',
  },
  upgradeDomainHeading: 'Δικό σου domain · €19/μήνα',
  upgradeDomainBody:
    'Δείξε ένα .gr ή .com που έχεις ήδη σε αυτό το site. SSL αυτόματο, οι πελάτες σου βλέπουν τη δική σου επωνυμία στο URL. Ακυρώνεις όποτε θες.',
  upgradeDomainCta: 'Πρόσθεσε domain (€19/μήνα)',
  upgradeBusy: 'Άνοιγμα checkout…',
  zipHeading: 'Self-host (Atelier ZIP)',
  zipBody: 'Αγόρασε το πλήρες Next.js project συμπληρωμένο με τα στοιχεία σου. Εγκατάσταση στο δικό σου Hostinger, χωρίς μηνιαία χρέωση. €190 μια φορά.',
  zipBuyCta: 'Αγόρασε το ZIP (€190)',
  zipDownload: 'Κατέβασε το ZIP',
};

// Other locales fall back to English for v1 — the signup wizard nudges
// customers to EL/EN. We add real DE/FR/IT translations when a customer
// asks for them.
const LABELS: Record<Locale, DashboardLabels> = {
  el: EL_LABELS,
  en: EN_LABELS,
  de: EN_LABELS,
  fr: EN_LABELS,
  it: EN_LABELS,
};

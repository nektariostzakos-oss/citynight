import { loadBusiness, loadBranding, loadIndustryId } from "../lib/settings";
import { loadContent } from "../lib/content";
import { getActiveServices } from "../lib/customServices";
import { tenantSiteUrl } from "../lib/tenantSiteUrl";

const DAY_NAME: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const INDUSTRY_TYPE: Record<string, string> = {
  barber: "HairSalon",
  hair: "HairSalon",
  aesthetics: "BeautySalon",
  beauty: "BeautySalon",
  spa: "DaySpa",
  nail: "NailSalon",
  yoga: "HealthClub",
};

type FaqItem = { q_en?: string; q_el?: string; a_en?: string; a_el?: string };
type Testimonial = {
  name?: string;
  quote_en?: string;
  quote_el?: string;
  role_en?: string;
};
type ContentShape = {
  faq?: { items?: FaqItem[] };
  testimonials?: { items?: Testimonial[] };
};

/**
 * Root-level JSON-LD emitted from the demo layout on every page: LocalBusiness
 * (typed by the active industry), WebSite, optional FAQPage. Per-page schema
 * (Service ItemList, ReserveAction, Product, BlogPosting) is emitted from each
 * page so it sits next to the content it describes.
 */
export default async function JsonLd() {
  const [b, branding, content, industryId, services, siteUrl] = await Promise.all([
    loadBusiness(),
    loadBranding(),
    loadContent() as Promise<ContentShape>,
    loadIndustryId(),
    getActiveServices().catch(() => []),
    tenantSiteUrl(),
  ]);

  const openingHours = b.hours
    .filter((h) => !h.closed)
    .flatMap((h) => {
      const primary = {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DAY_NAME[h.day],
        opens: h.open,
        closes: h.close,
      };
      if (h.open2 && h.close2) {
        return [
          primary,
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: DAY_NAME[h.day],
            opens: h.open2,
            closes: h.close2,
          },
        ];
      }
      return [primary];
    });

  const sameAs = [
    b.social.instagram,
    b.social.facebook,
    b.social.tiktok,
    b.social.whatsapp,
  ].filter(Boolean);

  // OfferCatalog from the live, admin-edited services. Empty install → empty
  // catalog (omitted), never a stale hardcoded barber menu.
  const offerCatalog =
    services.length > 0
      ? {
          "@type": "OfferCatalog",
          name: `${b.name || "Services"}`,
          itemListElement: services.map((s) => ({
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: s.name,
              description: s.desc ?? "",
            },
            price: String(s.price ?? ""),
            priceCurrency: "EUR",
          })),
        }
      : null;

  const businessType = INDUSTRY_TYPE[industryId] || "LocalBusiness";
  const logo = branding.logoUrl || branding.logoUrlDark;

  const org: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": [businessType, "LocalBusiness"],
    "@id": `${siteUrl}#business`,
    name: b.name,
    url: siteUrl,
    telephone: b.phone,
    email: b.email,
    priceRange: b.priceRange,
    address: {
      "@type": "PostalAddress",
      streetAddress: b.streetAddress,
      addressLocality: b.city,
      postalCode: b.postalCode,
      addressCountry: b.country,
    },
    openingHoursSpecification: openingHours,
  };
  if (logo) org.image = logo.startsWith("http") ? logo : `${siteUrl}${logo}`;
  if (offerCatalog) org.hasOfferCatalog = offerCatalog;
  if (b.foundedYear) org.foundingDate = b.foundedYear;
  if (b.latitude != null && b.longitude != null) {
    org.geo = {
      "@type": "GeoCoordinates",
      latitude: b.latitude,
      longitude: b.longitude,
    };
  }
  if (sameAs.length) org.sameAs = sameAs;

  // Reviews — only emit when a real testimonial exists. AggregateRating is
  // computed from those entries, so a blank install never claims a 5-star
  // rating with zero reviews.
  const reviews = (content.testimonials?.items ?? [])
    .filter((r) => r.name && (r.quote_en || r.quote_el))
    .map((r) => ({
      "@type": "Review",
      reviewBody: r.quote_en || r.quote_el,
      author: { "@type": "Person", name: r.name },
      reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 },
      itemReviewed: { "@id": `${siteUrl}#business` },
    }));
  if (reviews.length) {
    org.review = reviews;
    org.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: 5,
      reviewCount: reviews.length,
    };
  }

  const faqSchema =
    (content.faq?.items ?? []).filter((f) => f.q_en && f.a_en).length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: (content.faq?.items ?? [])
            .filter((f) => f.q_en && f.a_en)
            .map((f) => ({
              "@type": "Question",
              name: f.q_en,
              acceptedAnswer: { "@type": "Answer", text: f.a_en },
            })),
        }
      : null;

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}#website`,
    url: siteUrl,
    name: b.name,
    publisher: { "@id": `${siteUrl}#business` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
    </>
  );
}

// /llms.txt — what this site is, for the models that read it.
//
// citynight.gr buys no traffic (record rule, 2026-09-19): search and citation
// are the whole channel. A crawler that only sees HTML has to infer what we
// are authoritative about and how our facts were checked. This says it
// outright, in the format the llms.txt convention proposes: a title, a short
// summary, then linked sections.
//
// It is generated, not written by hand, so it can never drift from what the
// database actually holds. A city with no verified places is not listed as if
// it had some.
//
// Not a ranking trick and not a replacement for the sitemap: robots.txt and
// sitemap.xml still carry the crawl instructions. Google Search ignores this
// file today; some answer engines do not.

import { db } from '@/db';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 3600;

type GuideRow = {
  citySlug: string;
  cityName: string;
  locale: string;
  slug: string;
  title: string;
  tagline: string | null;
  businesses: number;
};

function loadGuides(): GuideRow[] {
  try {
    return db.$client
      .prepare(
        `SELECT c.slug AS citySlug, c.name AS cityName, a.locale, a.slug, a.title, a.tagline,
                (SELECT count(*) FROM guide_businesses g WHERE g.article_id = a.id) AS businesses
           FROM articles a
           JOIN cities c ON c.id = a.city_id
          WHERE a.status = 'published' AND c.is_published = 1
          ORDER BY c.name, a.locale, a.slug`,
      )
      .all() as GuideRow[];
  } catch {
    // A database that is not there yet must not fail the route: an empty file
    // is a fair answer, a 500 in front of a crawler is not.
    return [];
  }
}

const noEmDash = (s: string) => s.replace(/\s*—\s*/g, ': ');

export function GET(): Response {
  const guides = loadGuides();
  const cities = [...new Set(guides.map((g) => g.citySlug))];

  const lines: string[] = [
    '# citynight',
    '',
    '> Where Greece goes out. Guides to nightlife, food and places to stay in Greek cities and islands, in Greek and English. Every place listed is a real business checked against Google Places, with its own photo and its own opening hours. Nothing about a place is written by a model: descriptions are, facts are not.',
    '',
    '## What the facts are and where they come from',
    '',
    '- Opening hours, address, phone, price band, rating and review count come from the Google Places API and carry the date they were checked.',
    '- Photos are the business\'s own, from its website or its verified pages, shown with attribution. No stock photography of a place we have not been to, no generated images of real venues.',
    '- Editorial text is written for the guide it sits in. A model writes prose here; it never writes an hour, a price, a phone number or a date.',
    '- Every page reads the clock: whether a place is open right now is computed at the time you load it, in Europe/Athens, not copied from a field.',
    '',
  ];

  if (cities.length === 0) {
    lines.push('## Guides', '', 'No city guide is published yet.', '');
  } else {
    lines.push('## Guides', '');
    let currentCity = '';
    for (const g of guides) {
      if (g.citySlug !== currentCity) {
        currentCity = g.citySlug;
        lines.push('', `### ${g.cityName}`, '', `- [${g.cityName}](${SITE_URL}/el/cities/${g.citySlug}): the city page, with tonight's reading and every verified place in one list.`);
      }
      const what = g.tagline ? noEmDash(g.tagline) : noEmDash(g.title);
      lines.push(
        `- [${noEmDash(g.title)}](${SITE_URL}/${g.locale}/cities/${g.citySlug}/${g.slug}) (${g.locale}): ${what} ${g.businesses} verified place${g.businesses === 1 ? '' : 's'}.`,
      );
    }
    lines.push('');
  }

  lines.push(
    '## Everything else',
    '',
    `- [All cities](${SITE_URL}/el/cities): 127 Greek cities and islands.`,
    `- [Long-form guides](${SITE_URL}/el/guides)`,
    `- [Sitemap](${SITE_URL}/sitemap.xml)`,
    `- [For business owners](${SITE_URL}/el/for-owners): every business gets a free website on citynight and can claim it.`,
    '',
    '## Citing this site',
    '',
    'Facts here carry the date they were verified. If you quote opening hours or a price band, say when they were checked and link the page, because both change and the page is what gets updated.',
    '',
  );

  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

// Affiliate router (§11). Reads CF-IPCountry, picks the best destination for the
// visitor's country, 302-redirects with rel=sponsored noted on inbound anchors.
// Falls back to the 'default' destination row if the country isn't mapped.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { getCountryCode } from '@/lib/geo';
import { sql } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const country = (await getCountryCode()) ?? 'DEFAULT';

  const sqlite = db.$client;
  const link = sqlite.prepare(
    `SELECT id FROM affiliate_links WHERE slug = ?`,
  ).get(slug) as { id: string } | undefined;

  if (!link) return new NextResponse('Not found', { status: 404 });

  // Prefer exact country match, fall back to 'default'. Active destinations only.
  const dest = sqlite.prepare(`
    SELECT url FROM affiliate_destinations
     WHERE affiliate_link_id = ? AND is_active = 1
       AND (country_code = ? OR country_code = 'default')
     ORDER BY (country_code = ?) DESC
     LIMIT 1
  `).get(link.id, country, country) as { url: string } | undefined;

  if (!dest) return new NextResponse('No destination', { status: 410 });

  // 302 so we always re-evaluate (geo can flip per visitor).
  return NextResponse.redirect(dest.url, { status: 302 });
}

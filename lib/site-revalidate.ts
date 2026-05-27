// Shared helper — every owner save endpoint revalidates the affected
// /sites/{slug}{subpath} ISR entries. Lookup is by site id (we have that
// from auth), translation to slug is one query.

import 'server-only';
import { db } from '@/db';

const dbh = () => db.$client;

export function revalidateSitePaths(
  siteId: string,
  subpaths: readonly string[],
  revalidatePath: (path: string) => void,
): void {
  const row = dbh().prepare(`SELECT slug FROM sites WHERE id = ?`)
    .get(siteId) as { slug: string } | undefined;
  if (!row?.slug) return;
  for (const sub of subpaths) {
    revalidatePath(`/sites/${row.slug}${sub}`);
  }
}

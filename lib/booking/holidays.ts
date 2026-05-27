// Per-site closures. Replaces atelier's data/holidays.json with SQLite
// queries against site_holidays. Citynight schema doesn't carry a
// `recurring` flag (atelier had one); annual closures should be repeated
// per-year by the owner. This keeps lookup O(1) on a simple unique index.

import 'server-only';
import { db } from '@/db';

export type SiteHoliday = {
  id: string;
  siteId: string;
  date: string;                 // "YYYY-MM-DD"
  reason: string | null;
};

const dbh = () => db.$client;

function row(r: Record<string, unknown>): SiteHoliday {
  return {
    id: String(r.id),
    siteId: String(r.site_id),
    date: String(r.date),
    reason: (r.reason as string | null) ?? null,
  };
}

export function listHolidays(siteId: string): SiteHoliday[] {
  return (dbh().prepare(
    `SELECT id, site_id, date, reason
       FROM site_holidays
      WHERE site_id = ?
      ORDER BY date ASC`,
  ).all(siteId) as Record<string, unknown>[]).map(row);
}

export function isHoliday(siteId: string, dateIso: string): boolean {
  const r = dbh().prepare(
    `SELECT 1 FROM site_holidays WHERE site_id = ? AND date = ? LIMIT 1`,
  ).get(siteId, dateIso) as { '1': number } | undefined;
  return r !== undefined;
}

export function addHoliday(siteId: string, date: string, reason: string | null): SiteHoliday {
  const id = crypto.randomUUID();
  dbh().prepare(
    `INSERT INTO site_holidays (id, site_id, date, reason) VALUES (?, ?, ?, ?)`,
  ).run(id, siteId, date, reason);
  return { id, siteId, date, reason };
}

export function deleteHoliday(siteId: string, id: string): boolean {
  const info = dbh().prepare(
    `DELETE FROM site_holidays WHERE id = ? AND site_id = ?`,
  ).run(id, siteId);
  return info.changes > 0;
}

// Per-site staff roster. Replaces atelier's data/staff.json with SQLite
// queries against site_staff. Atelier shape: `workDays` int[] of weekdays
// (1=Mon … 7=Sun, ISO), `startTime`/`endTime`/`breakStart`/`breakEnd`
// as 24h "HH:MM".

import 'server-only';
import { db } from '@/db';

export type SiteStaff = {
  id: string;
  siteId: string;
  slug: string;
  name: string;
  role: string | null;
  bio: string | null;
  photoUrl: string | null;
  specialties: string[];
  enabled: boolean;
  sortOrder: number;
  workDays: number[];           // ISO weekday ints (1..7)
  startTime: string;            // "HH:MM"
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
};

const dbh = () => db.$client;

function row(r: Record<string, unknown>): SiteStaff {
  let workDays: number[] = [];
  let specialties: string[] = [];
  try { workDays = JSON.parse(String(r.work_days)) as number[]; } catch { workDays = []; }
  try { specialties = JSON.parse(String(r.specialties ?? '[]')) as string[]; } catch { specialties = []; }
  return {
    id: String(r.id),
    siteId: String(r.site_id),
    slug: String(r.slug),
    name: String(r.name),
    role: (r.role as string | null) ?? null,
    bio: (r.bio as string | null) ?? null,
    photoUrl: (r.photo_url as string | null) ?? null,
    specialties,
    enabled: Number(r.enabled) === 1,
    sortOrder: Number(r.sort_order),
    workDays,
    startTime: String(r.start_time),
    endTime: String(r.end_time),
    breakStart: (r.break_start as string | null) ?? null,
    breakEnd: (r.break_end as string | null) ?? null,
  };
}

const SELECT = `
  SELECT id, site_id, slug, name, role, bio, photo_url, specialties,
         enabled, sort_order, work_days, start_time, end_time,
         break_start, break_end
    FROM site_staff
`;

export function listStaff(siteId: string): SiteStaff[] {
  return (dbh().prepare(`${SELECT}
     WHERE site_id = ?
     ORDER BY sort_order ASC, name ASC
  `).all(siteId) as Record<string, unknown>[]).map(row);
}

export function listEnabledStaff(siteId: string): SiteStaff[] {
  return (dbh().prepare(`${SELECT}
     WHERE site_id = ? AND enabled = 1
     ORDER BY sort_order ASC, name ASC
  `).all(siteId) as Record<string, unknown>[]).map(row);
}

export function getStaff(siteId: string, idOrSlug: string): SiteStaff | null {
  const r = dbh().prepare(`${SELECT}
     WHERE site_id = ? AND (id = ? OR slug = ?)
     LIMIT 1
  `).get(siteId, idOrSlug, idOrSlug) as Record<string, unknown> | undefined;
  return r ? row(r) : null;
}

/**
 * Staff allowed to perform a given service. Honors the site_service_staff
 * junction — an EMPTY join for the service means "any enabled staff may
 * perform it", which we model by returning all enabled staff. A non-empty
 * join restricts to the listed staff.
 */
export function listStaffForService(siteId: string, serviceId: string): SiteStaff[] {
  const restricted = dbh().prepare(`
    SELECT staff_id FROM site_service_staff WHERE service_id = ?
  `).all(serviceId) as { staff_id: string }[];

  if (restricted.length === 0) return listEnabledStaff(siteId);

  const allowedIds = restricted.map((r) => r.staff_id);
  const placeholders = allowedIds.map(() => '?').join(',');
  return (dbh().prepare(`${SELECT}
     WHERE site_id = ? AND enabled = 1 AND id IN (${placeholders})
     ORDER BY sort_order ASC, name ASC
  `).all(siteId, ...allowedIds) as Record<string, unknown>[]).map(row);
}

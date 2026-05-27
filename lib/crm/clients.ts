// Per-site client directory. Populated as a side-effect of booking +
// order creation via upsertClientFromContact() — matches existing
// customer by email or phone, otherwise creates a fresh row.
//
// Rollups (totalBookings, totalSpentCents, lastBookedAt, lastOrderedAt)
// are maintained by recordBooking()/recordOrder() inside the booking +
// order transactions. Reading those columns is the dashboard's hot path
// so we don't aggregate on read.
//
// GDPR: deleteClient() sets `deleted_at` and wipes PII (email/phone/
// name/notes/tags). booking + order rows retain the snapshot fields, so
// the audit trail survives without leaking personal data.

import 'server-only';
import { db } from '@/db';

export type SiteClient = {
  id: string;
  siteId: string;
  email: string | null;
  phone: string | null;
  name: string;
  birthday: string | null;
  notes: string | null;
  tags: string[];
  preferredStaffId: string | null;
  totalBookings: number;
  totalSpentCents: number;
  loyaltyPoints: number;
  lastBookedAt: number | null;
  lastOrderedAt: number | null;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

const dbh = () => db.$client;

const SELECT = `
  SELECT id, site_id, email, phone, name, birthday, notes, tags,
         preferred_staff_id, total_bookings, total_spent_cents,
         loyalty_points, last_booked_at, last_ordered_at,
         deleted_at, created_at, updated_at
    FROM site_clients
`;

function row(r: Record<string, unknown>): SiteClient {
  let tags: string[] = [];
  try { tags = JSON.parse(String(r.tags ?? '[]')) as string[]; } catch { tags = []; }
  return {
    id: String(r.id),
    siteId: String(r.site_id),
    email: (r.email as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    name: String(r.name),
    birthday: (r.birthday as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    tags,
    preferredStaffId: (r.preferred_staff_id as string | null) ?? null,
    totalBookings: Number(r.total_bookings),
    totalSpentCents: Number(r.total_spent_cents),
    loyaltyPoints: Number(r.loyalty_points),
    lastBookedAt: r.last_booked_at !== null ? Number(r.last_booked_at) : null,
    lastOrderedAt: r.last_ordered_at !== null ? Number(r.last_ordered_at) : null,
    deletedAt: r.deleted_at !== null ? Number(r.deleted_at) : null,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

// ─── reads ────────────────────────────────────────────────────────────

export function listClients(
  siteId: string,
  opts: { search?: string; limit?: number; includeDeleted?: boolean } = {},
): SiteClient[] {
  const filters: string[] = ['site_id = ?'];
  const args: unknown[] = [siteId];
  if (!opts.includeDeleted) filters.push('deleted_at IS NULL');
  if (opts.search) {
    const like = `%${opts.search.toLowerCase()}%`;
    filters.push('(lower(name) LIKE ? OR lower(email) LIKE ? OR phone LIKE ?)');
    args.push(like, like, like);
  }
  const limit = Math.min(500, Math.max(1, Math.floor(opts.limit ?? 200)));
  return (dbh().prepare(`${SELECT}
     WHERE ${filters.join(' AND ')}
     ORDER BY last_booked_at DESC NULLS LAST, last_ordered_at DESC NULLS LAST, created_at DESC
     LIMIT ?
  `).all(...args, limit) as Record<string, unknown>[]).map(row);
}

export function getClient(siteId: string, clientId: string): SiteClient | null {
  const r = dbh().prepare(`${SELECT} WHERE site_id = ? AND id = ? LIMIT 1`)
    .get(siteId, clientId) as Record<string, unknown> | undefined;
  return r ? row(r) : null;
}

// ─── upsert + rollups ─────────────────────────────────────────────────

type ContactInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
};

/**
 * Upsert a client by email (case-insensitive) then by phone, in that
 * order. Returns the resolved client id. Designed to be called inside
 * the booking + order creation transactions, so a single transaction
 * sees a consistent client_id.
 */
export function upsertClientFromContact(siteId: string, input: ContactInput): string {
  const email = (input.email ?? '').trim().toLowerCase() || null;
  const phone = (input.phone ?? '').trim() || null;
  const name = input.name.trim();

  if (email) {
    const r = dbh().prepare(
      `SELECT id FROM site_clients
        WHERE site_id = ? AND lower(email) = ? AND deleted_at IS NULL
        LIMIT 1`,
    ).get(siteId, email) as { id: string } | undefined;
    if (r) {
      // Backfill phone if newly supplied.
      if (phone) {
        dbh().prepare(
          `UPDATE site_clients SET phone = COALESCE(phone, ?), updated_at = unixepoch() WHERE id = ?`,
        ).run(phone, r.id);
      }
      return r.id;
    }
  }
  if (phone) {
    const r = dbh().prepare(
      `SELECT id FROM site_clients
        WHERE site_id = ? AND phone = ? AND deleted_at IS NULL
        LIMIT 1`,
    ).get(siteId, phone) as { id: string } | undefined;
    if (r) {
      if (email) {
        dbh().prepare(
          `UPDATE site_clients SET email = COALESCE(email, ?), updated_at = unixepoch() WHERE id = ?`,
        ).run(email, r.id);
      }
      return r.id;
    }
  }

  // New client.
  const id = crypto.randomUUID();
  dbh().prepare(`
    INSERT INTO site_clients (id, site_id, email, phone, name)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, siteId, email, phone, name);
  return id;
}

/** Bump the booking rollups for a client after a confirmed booking. */
export function recordBookingForClient(clientId: string, priceCents: number, bookedAtUnix: number): void {
  dbh().prepare(`
    UPDATE site_clients
       SET total_bookings = total_bookings + 1,
           total_spent_cents = total_spent_cents + ?,
           last_booked_at = MAX(COALESCE(last_booked_at, 0), ?),
           updated_at = unixepoch()
     WHERE id = ?
  `).run(priceCents, bookedAtUnix, clientId);
}

/** Bump the order rollups for a client after a paid shop order. */
export function recordOrderForClient(clientId: string, totalCents: number, orderedAtUnix: number): void {
  dbh().prepare(`
    UPDATE site_clients
       SET total_spent_cents = total_spent_cents + ?,
           last_ordered_at = MAX(COALESCE(last_ordered_at, 0), ?),
           updated_at = unixepoch()
     WHERE id = ?
  `).run(totalCents, orderedAtUnix, clientId);
}

// ─── owner edits ──────────────────────────────────────────────────────

export type ClientPatch = {
  name?: string;
  notes?: string | null;
  tags?: string[];
  preferredStaffId?: string | null;
  loyaltyPoints?: number;
};

export function updateClient(siteId: string, clientId: string, patch: ClientPatch): SiteClient | null {
  const existing = dbh().prepare(`SELECT id FROM site_clients WHERE site_id = ? AND id = ? AND deleted_at IS NULL`)
    .get(siteId, clientId);
  if (!existing) return null;

  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.name !== undefined) {
    if (!patch.name || patch.name.length > 120) throw new Error('bad_name');
    sets.push('name = ?'); args.push(patch.name);
  }
  if (patch.notes !== undefined)             { sets.push('notes = ?'); args.push(patch.notes); }
  if (patch.tags !== undefined)              { sets.push('tags = ?'); args.push(JSON.stringify(patch.tags)); }
  if (patch.preferredStaffId !== undefined)  { sets.push('preferred_staff_id = ?'); args.push(patch.preferredStaffId); }
  if (patch.loyaltyPoints !== undefined) {
    if (!Number.isInteger(patch.loyaltyPoints) || patch.loyaltyPoints < 0) throw new Error('bad_loyalty');
    sets.push('loyalty_points = ?'); args.push(patch.loyaltyPoints);
  }
  if (sets.length === 0) return getClient(siteId, clientId);
  sets.push('updated_at = unixepoch()');
  args.push(siteId, clientId);
  dbh().prepare(`UPDATE site_clients SET ${sets.join(', ')} WHERE site_id = ? AND id = ?`).run(...args);
  return getClient(siteId, clientId);
}

/** GDPR-safe delete: wipes PII, keeps the row + rollup history. Booking
 * + order snapshot columns survive untouched for accounting. */
export function deleteClient(siteId: string, clientId: string): boolean {
  const info = dbh().prepare(`
    UPDATE site_clients
       SET email = NULL,
           phone = NULL,
           name = 'Deleted',
           notes = NULL,
           tags = '[]',
           birthday = NULL,
           deleted_at = unixepoch(),
           updated_at = unixepoch()
     WHERE site_id = ? AND id = ? AND deleted_at IS NULL
  `).run(siteId, clientId);
  return info.changes > 0;
}

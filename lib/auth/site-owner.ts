// Phase I.4 — Unified site-owner auth gate.
//
// citynight's auth (lib/auth/session.ts: cookie → hashed session row → user)
// is the single auth surface for the whole app. The vendored atelier
// template ships its own stateless `currentUser()` / `isAdmin()` /
// `isStaff()` cookie scheme — we do NOT port that. As atelier code is
// merged in (booking flows, admin pages, shop, CRM), every owner-gated
// route uses `requireSiteOwner(siteId)` defined here as its single auth
// check.
//
// Atelier's `data/users.json` (staff/barber logins) does NOT map to
// citynight users. site_staff rows are scheduling records, not platform
// accounts — they cannot sign in. If we ever add staff logins, a future
// migration will add `site_staff.user_id` FK to users + extend the role
// enum; until then, only site owners (sites.owner_id) have any session.

import 'server-only';
import { db } from '@/db';
import { requireUser, type AuthedUser } from './session';

const dbh = () => db.$client;

export type OwnedSite = {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
};

/**
 * The canonical auth gate for any site-scoped action.
 *
 * Throws `Response(401)` if not signed in, `Response(404)` if the site
 * doesn't exist, `Response(403)` if it does but the signed-in user
 * doesn't own it. Returns both the user and the site so callers don't
 * need a second DB hit.
 */
export async function requireSiteOwner(siteId: string): Promise<{ user: AuthedUser; site: OwnedSite }> {
  const user = await requireUser();
  const row = dbh().prepare(
    `SELECT id, owner_id AS ownerId, slug, name FROM sites WHERE id = ?`,
  ).get(siteId) as OwnedSite | undefined;
  if (!row) throw new Response('Not found', { status: 404 });
  if (row.ownerId !== user.id && user.role !== 'admin') {
    throw new Response('Forbidden', { status: 403 });
  }
  return { user, site: row };
}

/**
 * Non-throwing variant for read paths that already have a user in hand
 * (e.g. dashboard server components that pre-load several sites). Returns
 * null if the site doesn't exist or isn't owned.
 */
export function loadSiteIfOwner(siteId: string, userId: string): OwnedSite | null {
  const row = dbh().prepare(
    `SELECT id, owner_id AS ownerId, slug, name FROM sites WHERE id = ?`,
  ).get(siteId) as OwnedSite | undefined;
  if (!row) return null;
  if (row.ownerId !== userId) return null;
  return row;
}

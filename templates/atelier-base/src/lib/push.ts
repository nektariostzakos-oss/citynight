/**
 * Web Push subscription storage + delivery.
 *
 * Per-tenant `data/push-subscriptions.json` (resolved via getAppRoot, so the
 * SaaS bundle keeps every tenant's subscribers isolated, and the standalone
 * ZIP uses its own data/). Mutations are serialized through the file lock,
 * exactly like bookings.ts.
 *
 * Two audiences:
 *   - "customer": a visitor opting in for updates to their own bookings,
 *     matched later by the email / phone they gave at booking time.
 *   - "owner":   salon staff opting in to be alerted on every new booking
 *     and cancellation.
 *
 * Push is always best-effort. A failed or oversized send must NEVER throw
 * into a booking flow — every public function here swallows its own errors.
 */
import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";
import webpush from "web-push";
import { withFileLock } from "./fileLock";
import { getVapidKeys } from "./vapid";
import type { Lang } from "./langs";

const FILE = () => path.join(getAppRoot(), "data", "push-subscriptions.json");
const LOCK = "push-subscriptions.json";

export type PushAudience = "customer" | "owner";

export type PushSubscriptionRecord = {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  audience: PushAudience;
  /** Customer-only: the contact details to match this subscriber to bookings. */
  clientEmail?: string;
  clientPhone?: string;
  /** Owner-only: the staff user id that subscribed. */
  userId?: string;
  /** Preferred language for the notification copy, when known. */
  lang?: Lang;
  createdAt: string;
  lastSeenAt: string;
};

/** The raw PushSubscription JSON the browser produces. */
export type RawPushSubscription = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

/** Notification payload the service worker renders. */
export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  /** Keep the notification on screen until dismissed (owner alerts). */
  requireInteraction?: boolean;
};

async function readAll(): Promise<PushSubscriptionRecord[]> {
  try {
    const raw = await fs.readFile(FILE(), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PushSubscriptionRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(items: PushSubscriptionRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
}

function normEmail(v?: string | null): string | undefined {
  const s = (v || "").trim().toLowerCase();
  return s ? s : undefined;
}

function normPhone(v?: string | null): string | undefined {
  // Compare phones by digits only — formatting varies between the booking
  // form and the opt-in card.
  const s = (v || "").replace(/[^\d]/g, "");
  return s ? s : undefined;
}

/**
 * Insert or update a subscription, de-duped by `endpoint`. A returning
 * device re-subscribing simply refreshes its keys / contact / lastSeenAt.
 */
export async function saveSubscription(input: {
  subscription: RawPushSubscription;
  audience: PushAudience;
  clientEmail?: string;
  clientPhone?: string;
  userId?: string;
  lang?: Lang;
}): Promise<PushSubscriptionRecord | null> {
  const sub = input.subscription;
  if (
    !sub ||
    typeof sub.endpoint !== "string" ||
    !sub.endpoint ||
    !sub.keys ||
    typeof sub.keys.p256dh !== "string" ||
    typeof sub.keys.auth !== "string"
  ) {
    return null;
  }

  return withFileLock(LOCK, async () => {
    const all = await readAll();
    const now = new Date().toISOString();
    const existingIdx = all.findIndex((r) => r.endpoint === sub.endpoint);

    const record: PushSubscriptionRecord = {
      id:
        existingIdx >= 0
          ? all[existingIdx].id
          : `ps_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys!.p256dh!, auth: sub.keys!.auth! },
      audience: input.audience,
      clientEmail: normEmail(input.clientEmail),
      clientPhone: normPhone(input.clientPhone),
      userId: input.userId || undefined,
      lang: input.lang,
      createdAt: existingIdx >= 0 ? all[existingIdx].createdAt : now,
      lastSeenAt: now,
    };

    if (existingIdx >= 0) all[existingIdx] = record;
    else all.push(record);
    await writeAll(all);
    return record;
  });
}

/** Remove a subscription by its endpoint. Returns true if one was removed. */
export async function removeSubscription(endpoint: string): Promise<boolean> {
  if (!endpoint) return false;
  return withFileLock(LOCK, async () => {
    const all = await readAll();
    const next = all.filter((r) => r.endpoint !== endpoint);
    if (next.length === all.length) return false;
    await writeAll(next);
    return true;
  });
}

/** Prune a list of dead endpoints (push returned 404/410). */
async function pruneEndpoints(endpoints: string[]): Promise<void> {
  if (endpoints.length === 0) return;
  const dead = new Set(endpoints);
  await withFileLock(LOCK, async () => {
    const all = await readAll();
    const next = all.filter((r) => !dead.has(r.endpoint));
    if (next.length !== all.length) await writeAll(next);
  });
}

/**
 * Customer subscriptions that match a booking's email or phone. Either field
 * matching is enough — a visitor may have subscribed with only one of them.
 */
export async function subscriptionsForClient(
  email?: string | null,
  phone?: string | null
): Promise<PushSubscriptionRecord[]> {
  const e = normEmail(email);
  const p = normPhone(phone);
  if (!e && !p) return [];
  const all = await readAll();
  return all.filter(
    (r) =>
      r.audience === "customer" &&
      ((e && r.clientEmail === e) || (p && r.clientPhone === p))
  );
}

/** Every owner/staff subscription. */
export async function ownerSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const all = await readAll();
  return all.filter((r) => r.audience === "owner");
}

/** Owner subscriptions belonging to one staff user (used by the test push). */
export async function ownerSubscriptionsForUser(
  userId: string
): Promise<PushSubscriptionRecord[]> {
  const all = await readAll();
  return all.filter((r) => r.audience === "owner" && r.userId === userId);
}

/**
 * Send `payload` to every subscription in `subs`. Best-effort:
 *   - all sends run in parallel and individual failures are swallowed;
 *   - a 404 / 410 means the subscription is gone, so it is pruned;
 *   - if VAPID keys cannot be resolved, the whole call is a silent no-op.
 *
 * Returns a small summary, useful for the staff "send test" button. The
 * caller should never await this in a way that can break a booking; route
 * handlers fire it and ignore the promise.
 */
export async function sendPush(
  subs: PushSubscriptionRecord[],
  payload: PushPayload
): Promise<{ sent: number; failed: number; pruned: number }> {
  if (!subs || subs.length === 0) return { sent: 0, failed: 0, pruned: 0 };

  let keys;
  try {
    keys = await getVapidKeys();
  } catch {
    return { sent: 0, failed: 0, pruned: 0 };
  }

  // De-dupe by endpoint defensively.
  const seen = new Set<string>();
  const unique = subs.filter((s) => {
    if (seen.has(s.endpoint)) return false;
    seen.add(s.endpoint);
    return true;
  });

  // web-push truncates payloads it cannot encrypt; keep the body sane so a
  // huge string can never make the encrypted message exceed the 4 KB limit.
  const safePayload: PushPayload = {
    ...payload,
    title: String(payload.title || "").slice(0, 120),
    body: String(payload.body || "").slice(0, 400),
  };
  const body = JSON.stringify(safePayload);

  const dead: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    unique.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.keys.p256dh, auth: s.keys.auth },
          },
          body,
          {
            vapidDetails: {
              subject: keys.subject,
              publicKey: keys.publicKey,
              privateKey: keys.privateKey,
            },
            TTL: 60 * 60 * 24, // hold for a day if the device is offline
          }
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const status =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        if (status === 404 || status === 410) dead.push(s.endpoint);
      }
    })
  );

  if (dead.length > 0) {
    try {
      await pruneEndpoints(dead);
    } catch {
      /* pruning failure is non-fatal */
    }
  }

  return { sent, failed, pruned: dead.length };
}

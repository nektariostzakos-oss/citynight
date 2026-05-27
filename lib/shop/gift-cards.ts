// Per-site gift cards. Replaces atelier's data/gift-cards.json with
// SQLite queries against site_gift_cards + site_gift_card_redemptions.
// Balance is the running total — redeem() inserts a redemption row and
// decrements balance inside a single transaction.

import 'server-only';
import { db } from '@/db';

export type SiteGiftCard = {
  id: string;
  siteId: string;
  code: string;
  amountCents: number;
  balanceCents: number;
  currency: string;
  buyerName: string | null;
  buyerEmail: string | null;
  recipient: string | null;
  status: 'active' | 'redeemed' | 'expired' | 'void';
  issuedAt: number;
  expiresAt: number | null;
};

const dbh = () => db.$client;

const SELECT = `
  SELECT id, site_id, code, amount_cents, balance_cents, currency,
         buyer_name, buyer_email, recipient, status, issued_at, expires_at
    FROM site_gift_cards
`;

function row(r: Record<string, unknown>): SiteGiftCard {
  return {
    id: String(r.id),
    siteId: String(r.site_id),
    code: String(r.code),
    amountCents: Number(r.amount_cents),
    balanceCents: Number(r.balance_cents),
    currency: String(r.currency),
    buyerName: (r.buyer_name as string | null) ?? null,
    buyerEmail: (r.buyer_email as string | null) ?? null,
    recipient: (r.recipient as string | null) ?? null,
    status: r.status as SiteGiftCard['status'],
    issuedAt: Number(r.issued_at),
    expiresAt: r.expires_at !== null ? Number(r.expires_at) : null,
  };
}

export function getGiftCardByCode(siteId: string, code: string): SiteGiftCard | null {
  const r = dbh().prepare(`${SELECT}
     WHERE site_id = ? AND code = ?
     LIMIT 1
  `).get(siteId, code.toUpperCase().trim()) as Record<string, unknown> | undefined;
  return r ? row(r) : null;
}

export type RedeemResult =
  | { ok: true; giftCardId: string; appliedCents: number; remainingBalance: number }
  | { ok: false; reason: 'not_found' | 'inactive' | 'expired' | 'zero_balance' };

/**
 * Validate a gift card against an order subtotal and return how much it
 * can cover. Does NOT decrement — the caller passes the result back to
 * commitGiftCardRedemption() inside the order transaction.
 */
export function checkGiftCard(args: {
  siteId: string;
  code: string;
  subtotalCents: number;
  now?: number;
}): RedeemResult {
  const card = getGiftCardByCode(args.siteId, args.code);
  if (!card) return { ok: false, reason: 'not_found' };
  if (card.status !== 'active') return { ok: false, reason: 'inactive' };
  const now = args.now ?? Math.floor(Date.now() / 1000);
  if (card.expiresAt !== null && card.expiresAt < now) {
    return { ok: false, reason: 'expired' };
  }
  if (card.balanceCents <= 0) return { ok: false, reason: 'zero_balance' };

  const appliedCents = Math.min(card.balanceCents, args.subtotalCents);
  const remainingBalance = card.balanceCents - appliedCents;
  return { ok: true, giftCardId: card.id, appliedCents, remainingBalance };
}

/** Commit a gift-card redemption inside an order transaction. Inserts an
 * audit row + decrements balance + flips status to 'redeemed' when the
 * balance hits zero. */
export function commitGiftCardRedemption(args: {
  giftCardId: string;
  orderId: string;
  appliedCents: number;
  remainingBalance: number;
}): void {
  const conn = dbh();
  conn.prepare(`
    INSERT INTO site_gift_card_redemptions (id, gift_card_id, order_id, amount_cents)
    VALUES (?, ?, ?, ?)
  `).run(crypto.randomUUID(), args.giftCardId, args.orderId, args.appliedCents);
  conn.prepare(`
    UPDATE site_gift_cards
       SET balance_cents = ?,
           status = CASE WHEN ? = 0 THEN 'redeemed' ELSE status END
     WHERE id = ?
  `).run(args.remainingBalance, args.remainingBalance, args.giftCardId);
}

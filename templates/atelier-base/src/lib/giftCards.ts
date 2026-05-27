import { getAppRoot } from "@/lib/appRoot";
import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { withFileLock } from "./fileLock";

const FILE = () => path.join(getAppRoot(), "data", "gift-cards.json");
const LOCK = "gift-cards.json";

export type GiftCard = {
  id: string;
  code: string; // "GC-XXXX-XXXX"
  amount: number; // $ value at issue time
  balance: number; // remaining $
  buyerName: string;
  buyerEmail: string;
  /** Free-text recipient (if the buyer wrote one in notes). */
  recipient?: string;
  orderId?: string;
  issuedAt: string;
  status: "active" | "redeemed" | "expired";
  /** Free-form redemption log — each line is a date/amount/note entry. */
  redemptions: Array<{ at: string; amount: number; note?: string }>;
};

async function readAll(): Promise<GiftCard[]> {
  try {
    return JSON.parse(await fs.readFile(FILE(), "utf-8")) as GiftCard[];
  } catch {
    return [];
  }
}

async function writeAll(items: GiftCard[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomGroup(len: number): string {
  const b = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[b[i] % ALPHABET.length];
  return out;
}

export function generateGiftCardCode(): string {
  return `GC-${randomGroup(4)}-${randomGroup(4)}`;
}

export async function listGiftCards(): Promise<GiftCard[]> {
  const all = await readAll();
  return all.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export async function findGiftCard(code: string): Promise<GiftCard | null> {
  const all = await readAll();
  const c = code.toUpperCase().trim();
  return all.find((g) => g.code === c) ?? null;
}

export async function createGiftCard(input: {
  amount: number;
  buyerName: string;
  buyerEmail: string;
  recipient?: string;
  orderId?: string;
}): Promise<GiftCard> {
  // Reject nonsensical amounts server-side — defence in depth behind the
  // orders route which already clamps.
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Gift card amount must be positive.");
  }
  return withFileLock(LOCK, async () => {
    const all = await readAll();
    let code = generateGiftCardCode();
    while (all.some((g) => g.code === code)) code = generateGiftCardCode();
    const gc: GiftCard = {
      id: `gc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      code,
      amount: input.amount,
      balance: input.amount,
      buyerName: input.buyerName,
      buyerEmail: input.buyerEmail,
      recipient: input.recipient,
      orderId: input.orderId,
      issuedAt: new Date().toISOString(),
      status: "active",
      redemptions: [],
    };
    all.push(gc);
    await writeAll(all);
    return gc;
  });
}

/**
 * Partially or fully redeem a gift card. Returns the updated card, or
 * an error message if the code is invalid / insufficient balance.
 */
export async function redeemGiftCard(
  code: string,
  amount: number,
  note?: string
): Promise<{ ok: true; card: GiftCard } | { ok: false; error: string }> {
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false, error: "Amount must be positive." };
  return withFileLock(LOCK, async () => {
    const all = await readAll();
    const idx = all.findIndex((g) => g.code === code.toUpperCase().trim());
    if (idx < 0) return { ok: false, error: "Code not found." };
    const gc = all[idx];
    if (gc.status !== "active") return { ok: false, error: `Card is ${gc.status}.` };
    if (amount > gc.balance)
      return { ok: false, error: `Insufficient balance ($${gc.balance.toFixed(2)} left).` };
    gc.balance = Number((gc.balance - amount).toFixed(2));
    gc.redemptions.push({ at: new Date().toISOString(), amount, note });
    if (gc.balance <= 0) gc.status = "redeemed";
    await writeAll(all);
    return { ok: true, card: gc };
  });
}

/** Deactivate all gift cards issued against a specific order — called when
 * an order is cancelled so the refunded buyer can't also spend the card. */
export async function deactivateGiftCardsForOrder(orderId: string): Promise<number> {
  return withFileLock(LOCK, async () => {
    const all = await readAll();
    let n = 0;
    for (const gc of all) {
      if (gc.orderId === orderId && gc.status === "active") {
        gc.status = "expired";
        gc.redemptions.push({
          at: new Date().toISOString(),
          amount: gc.balance,
          note: `Deactivated — order ${orderId} cancelled`,
        });
        gc.balance = 0;
        n++;
      }
    }
    if (n > 0) await writeAll(all);
    return n;
  });
}

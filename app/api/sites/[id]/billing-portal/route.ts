import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';

// POST /api/sites/[id]/billing-portal — owner clicks "Manage billing" in
// the dashboard, we mint a Stripe Customer Portal session and return the
// URL. The customer manages plan, payment method, invoices, cancellation.

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  const { id } = await params;

  const site = db.$client.prepare(`
    SELECT id, owner_id, stripe_customer_id FROM sites WHERE id = ?
  `).get(id) as { id: string; owner_id: string; stripe_customer_id: string | null } | undefined;
  if (!site) return NextResponse.json({ ok: false }, { status: 404 });
  if (site.owner_id !== user.id) return NextResponse.json({ ok: false }, { status: 403 });
  if (!site.stripe_customer_id) {
    return NextResponse.json({ ok: false, error: 'No active subscription' }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const session = await stripe().billingPortal.sessions.create({
    customer: site.stripe_customer_id,
    return_url: `${base}/el/dashboard/sites/${id}`,
  });
  return NextResponse.json({ url: session.url });
}

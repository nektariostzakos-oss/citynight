// POST /api/sites/[id]/stripe/connect  — start / refresh onboarding.
// GET  /api/sites/[id]/stripe/connect  — read current readiness.
//
// Owner-gated. Creates the Connect Express account on first call (or
// reuses the existing one), then mints a single-use Account Link URL the
// owner navigates to in order to finish onboarding. The webhook flips the
// readiness flags on `account.updated`.

import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/csrf';
import { requireSiteOwner } from '@/lib/auth/site-owner';
import {
  ensureConnectAccount,
  createOnboardingLink,
  readConnectStatus,
} from '@/lib/stripe-connect';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }
  return NextResponse.json(readConnectStatus(id));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const { id } = await params;
  let user;
  try { ({ user } = await requireSiteOwner(id)); } catch (e) { if (e instanceof Response) return e; throw e; }

  const accountId = await ensureConnectAccount(id, user.email);

  // Return + refresh URLs point back into the owner dashboard. The
  // refresh URL is used by Stripe if the owner abandons the flow mid-way
  // and clicks resume.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get('host') ?? 'citynight.gr'}`;
  const dashboard = `${base.replace(/\/$/, '')}/${user.locale ?? 'el'}/dashboard/sites/${id}`;

  const url = await createOnboardingLink({
    accountId,
    returnUrl: `${dashboard}?connect=done`,
    refreshUrl: `${dashboard}?connect=refresh`,
  });

  return NextResponse.json({ url, accountId });
}

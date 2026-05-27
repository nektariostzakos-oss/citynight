import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentTenant, tenantCookiePath } from "../../lib/tenantContext";
import { listUsers, signSession } from "../../lib/users";

/**
 * GET /<slug>/__impersonate?t=<token>
 *
 * Operator impersonation landing. The Atelier marketing app mints a one-time
 * token (src/lib/impersonation.ts) and redirects the operator here. This route
 * consumes the token, opens a tenant-admin session by setting the same
 * `atelier_session` cookie that demo/src/lib/auth.ts signIn() sets, and sends
 * the operator to /admin.
 *
 * The token store lives at the BUNDLE root (data/impersonation-tokens.json) —
 * the same file the marketing helper writes. The demo cannot import marketing
 * code (it ships standalone to customers), so the consume logic is duplicated
 * here. It stays inert in a standalone install: with no tenant in context the
 * route refuses, and no token file is ever present.
 */

const SESSION_COOKIE = "atelier_session";

type ImpersonationToken = {
  token: string;
  operatorEmail: string;
  tenantSlug: string;
  expiresAt: string;
};

/** The bundle root, where data/impersonation-tokens.json lives. */
function tokenFile(): string {
  const root = process.env.ATELIER_TENANTS_ROOT || process.cwd();
  return path.join(root, "data", "impersonation-tokens.json");
}

async function readTokens(file: string): Promise<ImpersonationToken[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(file, "utf-8"));
    return Array.isArray(parsed) ? (parsed as ImpersonationToken[]) : [];
  } catch {
    return [];
  }
}

/**
 * Consume a token: validate, reject if expired, and delete it (one-time use).
 * Mirrors src/lib/impersonation.ts consumeImpersonation. Uses Node fs directly
 * with a small retry rather than a shared lock, since the demo's withFileLock
 * keys on the same globalThis map as the marketing app.
 */
async function consume(
  token: string,
): Promise<{ operatorEmail: string; tenantSlug: string } | null> {
  const file = tokenFile();
  const all = await readTokens(file);
  const idx = all.findIndex((t) => t.token === token);
  if (idx === -1) return null;
  const entry = all[idx];
  all.splice(idx, 1);
  try {
    await fs.writeFile(file, JSON.stringify(all, null, 2) + "\n", "utf-8");
  } catch {
    /* best effort — a failed delete must not grant a replayable session */
    return null;
  }
  if (new Date(entry.expiresAt).getTime() <= Date.now()) return null;
  return { operatorEmail: entry.operatorEmail, tenantSlug: entry.tenantSlug };
}

export async function GET(req: NextRequest) {
  const slug = getCurrentTenant();
  // Impersonation only exists inside the SaaS bundle. A standalone customer
  // install has no tenant context and must never honour this route.
  if (!slug) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const token = req.nextUrl.searchParams.get("t") || "";
  const failUrl = new URL(`/${slug}/admin/login`, req.url);

  if (!token) {
    return NextResponse.redirect(failUrl);
  }

  const result = await consume(token);
  if (!result || result.tenantSlug !== slug) {
    return NextResponse.redirect(failUrl);
  }

  // Open a tenant-admin session as the tenant's admin user.
  const users = await listUsers();
  const admin = users.find((u) => u.role === "admin") ?? users[0];
  if (!admin) {
    return NextResponse.redirect(failUrl);
  }

  const sessionToken = await signSession(admin.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: tenantCookiePath(),
    maxAge: 60 * 60 * 8,
  });

  return NextResponse.redirect(new URL(`/${slug}/admin`, req.url));
}

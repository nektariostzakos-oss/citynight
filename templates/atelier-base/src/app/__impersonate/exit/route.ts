import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentTenant } from "../../../lib/tenantContext";

/**
 * POST /<slug>/__impersonate/exit
 *
 * Ends an operator impersonation session: clears the `atelier_session` cookie
 * (the same one demo/src/lib/auth.ts signOut() deletes) and sends the operator
 * back to the marketing-side tenant detail page.
 *
 * Inert in a standalone customer install — with no tenant in context it just
 * clears the cookie and redirects to the site root.
 */

const SESSION_COOKIE = "atelier_session";

export async function POST(req: NextRequest) {
  const slug = getCurrentTenant();

  const jar = await cookies();
  jar.delete(SESSION_COOKIE);

  // Full Location so the browser leaves the demo app and lands on the
  // marketing-side tenant detail page.
  const origin = req.nextUrl.origin;
  const target = slug
    ? `${origin}/support/admin/tenants/${slug}`
    : `${origin}/`;

  return NextResponse.redirect(target, 302);
}

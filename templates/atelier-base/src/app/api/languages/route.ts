import { NextResponse } from "next/server";
import { loadEnabledLanguages } from "../../../lib/i18nServer";

/**
 * Public, unauthenticated: the language codes the shop shows in its header
 * switcher (settings.json `enabledLanguages`, "en" always included).
 *
 * The client LangProvider fetches this on mount. Pages are ISR / statically
 * cached, so the `enabled` prop the server layout passes can be stale; this
 * route is force-dynamic + no-store, so a change in the admin Site Languages
 * panel shows up on the next page load without a rebuild.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const enabled = await loadEnabledLanguages();
  return NextResponse.json(
    { enabled },
    { headers: { "cache-control": "no-store" } },
  );
}

import { ImageResponse } from "next/og";
import { createElement } from "react";
import type { NextRequest } from "next/server";
import { loadBranding } from "../../lib/settings";

/**
 * PWA install icons. The manifest needs a 192px and a 512px square icon for a
 * browser to consider the site installable; the auto-favicon (`icon.tsx`) is
 * only 32px, far too small. This route renders the salon's mark at either
 * size on a full-bleed background, which doubles as a valid `maskable` icon
 * (the mark sits well inside the safe zone, no transparent corners).
 *
 *   GET /icon-pwa?s=192   -> 192x192 PNG
 *   GET /icon-pwa?s=512   -> 512x512 PNG  (default)
 *
 * Tenant-aware: under a SaaS tenant the request carries tenant context, so
 * loadBranding() resolves that tenant's wordmark.
 */
export async function GET(req: NextRequest) {
  const requested = Number(new URL(req.url).searchParams.get("s")) || 512;
  const size = requested >= 384 ? 512 : 192;

  const branding = await loadBranding().catch(() => null);
  const mark =
    (branding?.wordmark || "S").trim().charAt(0).toUpperCase() || "S";

  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          background: "#0a0806",
          color: "#c9a961",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(size * 0.5),
          fontWeight: 700,
          fontFamily: "serif",
          letterSpacing: -Math.round(size * 0.02),
        },
      },
      mark,
    ),
    { width: size, height: size },
  );
}

import { ImageResponse } from "next/og";
import { loadBranding, loadBusiness } from "../lib/settings";

export const alt = "Your Salon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const [branding, business] = await Promise.all([
    loadBranding().catch(() => null),
    loadBusiness().catch(() => null),
  ]);
  const wordmark = branding?.wordmark || business?.name || "Your Salon";
  const tagline =
    branding?.tagline_en || "Cuts, colour, care";
  const city = business?.city || "";
  const gold = "#c9a961";
  const bg = "#0a0806";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: bg,
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px 96px",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: gold,
              color: bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            {(wordmark[0] || "S").toUpperCase()}
          </div>
          <span
            style={{
              color: gold,
              letterSpacing: 6,
              fontSize: 18,
              fontFamily: "sans-serif",
              textTransform: "uppercase",
            }}
          >
            {city} · Barber
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 108, fontWeight: 700, lineHeight: 1.05, letterSpacing: -3 }}>
            {wordmark}
          </div>
          <div style={{ fontSize: 36, color: "#d7cfc1", maxWidth: 900, lineHeight: 1.25 }}>
            {tagline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontFamily: "sans-serif",
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#8e8579",
          }}
        >
          <span>Book online · Walk-ins welcome</span>
          <span style={{ color: gold }}>yoursalon.com</span>
        </div>
      </div>
    ),
    size
  );
}

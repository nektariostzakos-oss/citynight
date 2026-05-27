import { ImageResponse } from "next/og";
import { loadBranding } from "../lib/settings";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const branding = await loadBranding().catch(() => null);
  const mark = (branding?.wordmark || "S").trim().charAt(0).toUpperCase() || "S";
  const gold = "#c9a961";
  const bg = "#0a0806";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: bg,
          color: gold,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 120,
          fontWeight: 700,
          fontFamily: "serif",
          letterSpacing: -4,
        }}
      >
        {mark}
      </div>
    ),
    size
  );
}

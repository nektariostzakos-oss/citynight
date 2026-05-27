import { ImageResponse } from "next/og";
import { loadBranding } from "../lib/settings";

// Auto-generated favicon. Admin can override by uploading a .ico to public/favicon.ico.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
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
          fontSize: 22,
          fontWeight: 700,
          fontFamily: "serif",
          letterSpacing: -1,
        }}
      >
        {mark}
      </div>
    ),
    size
  );
}

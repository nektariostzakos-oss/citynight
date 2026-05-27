import { NextRequest, NextResponse } from "next/server";
import { recordView } from "../../../lib/views";
import { allowAction, clientIp } from "../../../lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!allowAction(`track:${ip}`, 240, 60 * 60_000)) {
    return NextResponse.json({ ok: true });
  }
  try {
    const body = await req.json();
    const p = typeof body.path === "string" ? body.path.slice(0, 200) : "/";
    if (p.startsWith("/admin") || p.startsWith("/api")) {
      return NextResponse.json({ ok: true });
    }
    await recordView({
      path: p,
      ref: typeof body.ref === "string" ? body.ref.slice(0, 200) : "",
      lang: typeof body.lang === "string" ? body.lang.slice(0, 8) : "",
      ua: (req.headers.get("user-agent") || "").slice(0, 200),
      sid: typeof body.sid === "string" ? body.sid.slice(0, 40) : "",
    });
  } catch {}
  return NextResponse.json({ ok: true });
}

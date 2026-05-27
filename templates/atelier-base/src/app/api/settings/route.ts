import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../lib/auth";
import { loadSettings, saveSettings } from "../../../lib/settings";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await loadSettings();
  // Hide secrets from the API response (still saved on disk).
  if (settings.smtp) {
    settings.smtp = { ...settings.smtp, pass: settings.smtp.pass ? "********" : "" };
  }
  if (settings.ai) {
    settings.ai = { ...settings.ai, apiKey: settings.ai.apiKey ? "********" : "" };
  }
  if (settings.payments) {
    settings.payments = {
      ...settings.payments,
      stripeSecretKey: settings.payments.stripeSecretKey ? "********" : "",
    };
  }
  return NextResponse.json({ settings });
}

/** Keys the client is permitted to update via PATCH /api/settings. */
const SETTINGS_ALLOWLIST = new Set<string>([
  "smtp", "branding", "business", "nav", "templates",
  "analytics", "ai", "payments", "theme", "typography",
  "bookingMode", "industryId", "onboarded", "license", "enabledLanguages",
  "template",
]);

/** Prototype-pollution sentinels — reject any body that carries these. */
const PROTO_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = await req.json();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Reject proto-pollution attempts.
  for (const key of Object.keys(raw)) {
    if (PROTO_KEYS.has(key)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
  }

  // Build an allowlisted update object — unknown top-level keys are dropped.
  const body: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (SETTINGS_ALLOWLIST.has(key)) {
      body[key] = raw[key];
    }
  }

  const current = await loadSettings();

  // Don't overwrite saved secrets if the client sent the masked stub back.
  if ((body.smtp as { pass?: string } | undefined)?.pass === "********") {
    (body.smtp as { pass: string }).pass = current.smtp?.pass ?? "";
  }
  if ((body.ai as { apiKey?: string } | undefined)?.apiKey === "********") {
    (body.ai as { apiKey: string }).apiKey = current.ai?.apiKey ?? "";
  }
  if ((body.payments as { stripeSecretKey?: string } | undefined)?.stripeSecretKey === "********") {
    (body.payments as { stripeSecretKey: string }).stripeSecretKey = current.payments?.stripeSecretKey ?? "";
  }

  await saveSettings(body as Parameters<typeof saveSettings>[0]);
  return NextResponse.json({ ok: true });
}

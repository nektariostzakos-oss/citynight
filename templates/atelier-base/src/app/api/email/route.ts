import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../lib/auth";
import { isSmtpConfigured, readEmailLog, sendBulk } from "../../../lib/email";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    smtp: isSmtpConfigured(),
    log: await readEmailLog(),
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { recipients, subject, body } = await req.json();
  if (!Array.isArray(recipients) || !subject || !body) {
    return NextResponse.json(
      { error: "recipients[], subject, body required" },
      { status: 400 }
    );
  }
  const result = await sendBulk(recipients, subject, body);
  return NextResponse.json(result);
}

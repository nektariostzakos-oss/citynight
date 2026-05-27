import { NextRequest, NextResponse } from "next/server";
import { signIn, signOut, currentUser } from "../../../lib/auth";
import { allowAction, clientIp } from "../../../lib/rateLimit";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null });
  const { passwordHash: _passwordHash, ...pub } = user;
  return NextResponse.json({ user: pub });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  // Two layers of brake pedal:
  //   - 10 attempts / 10 min / IP (stops casual brute force)
  //   - 20 attempts / 1 h / (IP + email) (stops targeted account attacks)
  if (!allowAction(`login:ip:${ip}`, 10, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );
  }
  if (!allowAction(`login:acct:${ip}:${String(email).toLowerCase()}`, 20, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Too many login attempts for this account. Try again later." },
      { status: 429 }
    );
  }
  const user = await signIn(String(email), String(password));
  if (!user) {
    return NextResponse.json(
      { error: "Wrong email or password" },
      { status: 401 }
    );
  }
  const { passwordHash: _passwordHash, ...pub } = user;
  return NextResponse.json({ user: pub });
}

export async function DELETE() {
  await signOut();
  return NextResponse.json({ ok: true });
}

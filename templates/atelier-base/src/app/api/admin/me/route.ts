import { NextResponse } from "next/server";
import { currentUser } from "../../../../lib/auth";

export async function GET() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ admin: false, user: null });
  return NextResponse.json({
    admin: u.role === "admin",
    user: {
      id: u.id,
      email: u.email,
      role: u.role,
      barberId: u.barberId,
    },
  });
}

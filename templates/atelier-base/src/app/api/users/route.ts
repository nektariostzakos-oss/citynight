import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../lib/auth";
import {
  createUser,
  listUsers,
  type Role,
} from "../../../lib/users";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ users: await listUsers() });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { email, role, password, barberId } = await req.json();
  if (!email || !password || !role) {
    return NextResponse.json(
      { error: "email, role and password required" },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }
  if (role !== "admin" && role !== "barber") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  try {
    const u = await createUser({ email, role: role as Role, password, barberId });
    return NextResponse.json({ user: u }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 409 }
    );
  }
}

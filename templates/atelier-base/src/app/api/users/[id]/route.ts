import { NextRequest, NextResponse } from "next/server";
import { isAdmin, currentUser } from "../../../../lib/auth";
import { deleteUser, updatePassword } from "../../../../lib/users";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  if (!body.password || String(body.password).length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }
  // Anyone can change their own password; admins can change anyone's.
  if (me.id !== id && me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const ok = await updatePassword(id, body.password);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteUser(id);
  if (!ok)
    return NextResponse.json(
      { error: "Cannot delete (last admin or not found)" },
      { status: 400 }
    );
  return NextResponse.json({ ok: true });
}

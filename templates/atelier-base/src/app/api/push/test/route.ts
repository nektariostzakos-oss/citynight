import { NextResponse } from "next/server";
import { currentUser } from "../../../../lib/auth";
import { ownerSubscriptionsForUser } from "../../../../lib/push";
import { sendOwnerTestPush } from "../../../../lib/notify";

/**
 * Staff-only: send a test push to the caller's own owner subscriptions, so
 * an owner can confirm notifications work on the device they just enabled.
 */
export async function POST() {
  const me = await currentUser();
  if (!me || (me.role !== "admin" && me.role !== "barber")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const subs = await ownerSubscriptionsForUser(me.id);
  if (subs.length === 0) {
    return NextResponse.json(
      { error: "No notifications enabled on a device for this account yet." },
      { status: 400 }
    );
  }
  const result = await sendOwnerTestPush(subs);
  return NextResponse.json({ ok: true, ...result });
}

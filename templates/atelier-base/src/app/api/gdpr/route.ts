import { getAppRoot } from "@/lib/appRoot";
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { isAdmin } from "../../../lib/auth";
import { listBookings } from "../../../lib/bookings";
import { listOrders } from "../../../lib/orders";

const DATA_DIR = () => path.join(getAppRoot(), "data");

function matches(identifier: string, email: string, phone: string): boolean {
  const id = identifier.toLowerCase().trim();
  if (email && email.toLowerCase() === id) return true;
  if (phone && phone.replace(/[^\d+]/g, "") === id.replace(/[^\d+]/g, "")) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const identifier = new URL(req.url).searchParams.get("id") || "";
  if (!identifier) return NextResponse.json({ error: "id (email or phone) required" }, { status: 400 });

  const [bookings, orders] = await Promise.all([listBookings(), listOrders()]);
  const myBookings = bookings.filter((b) => matches(identifier, b.email, b.phone));
  const myOrders = orders.filter((o) => matches(identifier, o.email, o.phone));

  const out = JSON.stringify({ identifier, exportedAt: new Date().toISOString(), bookings: myBookings, orders: myOrders }, null, 2);
  return new NextResponse(out, {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="gdpr-${Date.now()}.json"`,
    },
  });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const identifier = new URL(req.url).searchParams.get("id") || "";
  if (!identifier) return NextResponse.json({ error: "id required" }, { status: 400 });

  async function redact(file: string, fields: string[]) {
    const p = path.join(DATA_DIR(), file);
    try {
      const arr = JSON.parse(await fs.readFile(p, "utf-8")) as Record<string, string>[];
      let changed = 0;
      const next = arr.map((row) => {
        if (matches(identifier, row.email || "", row.phone || "")) {
          changed++;
          const out = { ...row };
          for (const f of fields) out[f] = "[redacted]";
          return out;
        }
        return row;
      });
      if (changed > 0) await fs.writeFile(p, JSON.stringify(next, null, 2), "utf-8");
      return changed;
    } catch {
      return 0;
    }
  }
  const PII = ["name", "email", "phone", "address", "notes"];
  const bk = await redact("bookings.json", PII);
  const od = await redact("orders.json", [...PII, "city", "postal"]);
  const cl = await redact("clients.json", PII);
  return NextResponse.json({ ok: true, redacted: { bookings: bk, orders: od, clients: cl } });
}

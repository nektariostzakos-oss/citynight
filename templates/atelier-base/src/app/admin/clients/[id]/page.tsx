import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "../../../../lib/auth";
import { getClientDetail } from "../../../../lib/clients";
import { referralCodeForClient } from "../../../../lib/referralCodes";
import ClientProfileActions from "./ClientProfileActions";

export const metadata = {
  title: "Client · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  const { id } = await params;
  const client = await getClientDetail(id);
  if (!client) notFound();

  const recentBookings = client.bookings.slice(0, 10);
  const completed = client.bookings.filter((b) => b.status === "completed").length;
  const referralCode = await referralCodeForClient(client.id);

  return (
    <div className="min-h-screen bg-[#0a0806] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-[10px] uppercase tracking-widest text-white/50 hover:text-[#c9a961]">
          ← Admin
        </Link>
        <h1 className="mt-4 font-serif text-3xl">{client.name}</h1>
        <p className="mt-1 text-sm text-white/50">
          {client.email || "—"} · {client.phone || "—"}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <Stat label="Bookings" value={String(client.bookingCount)} />
          <Stat label="Completed" value={String(completed)} />
          <Stat label="Lifetime $" value={`$${client.lifetimeValue.toFixed(0)}`} />
          <Stat label="No-shows / cancel" value={String(client.noShowCount)} />
        </div>

        {(client.birthdayThisMonth || (client.loyaltyPoints ?? client.bookingCount) >= 5) && (
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
            {client.birthdayThisMonth && (
              <span className="rounded-full px-3 py-1"
                style={{ background: "color-mix(in srgb, #e879f9 20%, transparent)", color: "#f0abfc" }}>
                🎂 Birthday month
              </span>
            )}
            {(client.loyaltyPoints ?? client.bookingCount) >= 5 && (
              <span className="rounded-full px-3 py-1"
                style={{ background: "color-mix(in srgb, #c9a961 25%, transparent)", color: "#c9a961" }}>
                Loyalty · {client.loyaltyPoints ?? client.bookingCount} visits
              </span>
            )}
            {client.tags?.map((t) => (
              <span key={t} className="rounded-full border border-white/15 px-3 py-1 text-white/70">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">Referral code</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="rounded-md bg-black/40 px-3 py-2 font-mono text-lg text-[#c9a961]">
              {referralCode}
            </code>
            <span className="text-xs text-white/50">
              Share with friends. 10% off for them when they use it at checkout.
            </span>
          </div>
        </div>

        <ClientProfileActions client={client} />

        <h2 className="mt-12 mb-4 text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">
          Recent bookings
        </h2>
        {recentBookings.length === 0 ? (
          <p className="text-sm text-white/40">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-left text-[10px] uppercase tracking-widest text-white/50">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Stylist</th>
                  <th className="px-4 py-3 text-right">$</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 whitespace-nowrap">{b.date} · {b.time}</td>
                    <td className="px-4 py-3">{b.serviceName}</td>
                    <td className="px-4 py-3">{b.barberName}</td>
                    <td className="px-4 py-3 text-right">${b.price}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                        b.status === "completed" ? "bg-emerald-500/15 text-emerald-300" :
                        b.status === "cancelled" ? "bg-red-500/15 text-red-300" :
                        b.status === "confirmed" ? "bg-amber-500/15 text-amber-200" :
                        "bg-white/10 text-white/60"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {client.orders.length > 0 && (
          <>
            <h2 className="mt-12 mb-4 text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">
              Shop orders
            </h2>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.03] text-left text-[10px] uppercase tracking-widest text-white/50">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3 text-right">$</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {client.orders.slice(0, 10).map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-3 whitespace-nowrap">{o.createdAt.slice(0, 10)}</td>
                      <td className="px-4 py-3">{o.items.map((i) => i.name).join(", ")}</td>
                      <td className="px-4 py-3 text-right">${o.subtotal}</td>
                      <td className="px-4 py-3 text-xs uppercase tracking-widest text-white/60">{o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
      <p className="mt-1 font-serif text-2xl text-white">{value}</p>
    </div>
  );
}

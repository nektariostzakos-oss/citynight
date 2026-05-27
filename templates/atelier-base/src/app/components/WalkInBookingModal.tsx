"use client";

import { useEffect, useRef, useState } from "react";

type Service = { id: string; name: string; duration: number; price: number };
type Staff = { id: string; name: string };

/**
 * Admin-side walk-in booking modal. Creates a booking on the server with
 * walkIn=true — no customer self-service email, no confirmation sent by
 * default. Useful for front-desk scenarios (phone booking, in-shop
 * client asking for tomorrow, etc).
 */
export default function WalkInBookingModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("any");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Focus trap refs
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Store the element that opened the modal so we can restore focus on close
  useEffect(() => {
    triggerRef.current = document.activeElement;
  }, []);

  // Move focus into the modal on open
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const first = dialog.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    first?.focus();
  }, []);

  // Close on ESC + focus trap
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!dialogRef.current) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Restore focus to the trigger element when modal closes
  const handleClose = () => {
    if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
    onClose();
  };

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => {
        const arr = (d.services || d || []) as Service[];
        setServices(arr);
        if (arr.length && !serviceId) setServiceId(arr[0].id);
      })
      .catch(() => {});
    fetch("/api/staff")
      .then((r) => r.ok ? r.json() : { staff: [] })
      .then((d) => setStaff([...(d.staff as Staff[] ?? []), { id: "any", name: "First Available" }]))
      .catch(() => {});
  }, []);

  const selectedService = services.find((s) => s.id === serviceId);

  async function save() {
    if (!selectedService) return setErr("Pick a service.");
    if (!name || !phone) return setErr("Name and phone required.");
    const barber = staff.find((s) => s.id === barberId);
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceId,
          serviceName: selectedService.name,
          price: selectedService.price,
          duration: selectedService.duration,
          barberId,
          barberName: barber?.name || "First Available",
          date,
          time,
          name,
          phone,
          email: sendEmail ? email : "",
          notes: notes ? `[walk-in] ${notes}` : "[walk-in]",
          walkIn: true,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Booking failed");
      }
      onCreated?.();
      handleClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkin-title"
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0c09] p-6"
        aria-hidden="false"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">Walk-in</p>
            <h2 id="walkin-title" className="font-serif text-2xl text-white">New booking</h2>
          </div>
          <button onClick={handleClose} className="text-white/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a961] rounded" aria-label="Close dialog">
            ✕
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          <label htmlFor="walkin-service" className="text-xs uppercase tracking-widest text-white/60">Service</label>
          <select id="walkin-service" value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a961]">
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} · {s.duration}min · ${s.price}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="walkin-stylist" className="text-xs uppercase tracking-widest text-white/60">Stylist</label>
              <select id="walkin-stylist" value={barberId} onChange={(e) => setBarberId(e.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a961]">
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="walkin-date" className="text-xs uppercase tracking-widest text-white/60">Date</label>
              <input id="walkin-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a961]" style={{ colorScheme: "dark" }} />
            </div>
          </div>

          <label htmlFor="walkin-time" className="text-xs uppercase tracking-widest text-white/60">Time</label>
          <input id="walkin-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a961]" style={{ colorScheme: "dark" }} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="walkin-name" className="text-xs uppercase tracking-widest text-white/60">Name</label>
              <input id="walkin-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a961]" />
            </div>
            <div>
              <label htmlFor="walkin-phone" className="text-xs uppercase tracking-widest text-white/60">Phone</label>
              <input id="walkin-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a961]" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-white/60">
            <input id="walkin-send-email" type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} style={{ accentColor: "#c9a961" }} />
            Send confirmation email
          </label>
          {sendEmail && (
            <input id="walkin-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" type="email" aria-label="Client email address" className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a961]" />
          )}

          <label htmlFor="walkin-notes" className="text-xs uppercase tracking-widest text-white/60">Notes (optional)</label>
          <textarea id="walkin-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a961]" />

          {err && <p role="alert" className="text-xs text-red-300">{err}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button onClick={handleClose} className="rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-widest text-white/70 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a961]">
              Cancel
            </button>
            <button onClick={save} disabled={saving} className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a961]">
              {saving ? "Saving…" : "Create booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

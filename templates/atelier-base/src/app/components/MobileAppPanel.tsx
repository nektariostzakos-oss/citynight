"use client";

/**
 * Mobile-app admin panel.
 *
 * One screen for the owner to build a signed Android APK for their site:
 * branding settings on top, a big "Build" button, then a list of recent
 * builds with download / delete. Status updates by polling the build record
 * every three seconds while a build is in flight.
 *
 * Used both by the dedicated /admin/mobile-app page and the Marketing-group
 * tab inside the admin dashboard.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { withBasePath } from "../../lib/basePath";

type Status = "queued" | "building" | "signing" | "ready" | "failed";

type Build = {
  id: string;
  status: Status;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  apkRelPath?: string;
  apkSizeBytes?: number;
  versionCode: number;
  appVersion: string;
  downloads: number;
};

type MobileApp = {
  appName: string;
  launcherName: string;
  packageId: string;
  themeColor: string;
  backgroundColor: string;
  darkColor: string;
  maskableIconUrl?: string;
  monochromeIconUrl?: string;
  lastVersionCode: number;
  lockedPackageId: boolean;
  hasSigningKey: boolean;
  installPageEnabled: boolean;
};

/**
 * Per-stage progress floor. The smooth-creep ticker always interpolates
 * UP from wherever the bar currently is to the next stage's floor (then
 * eases asymptotically toward 95), so a slow PWABuilder call still makes
 * the bar move every tick instead of sitting at one number for a minute.
 */
const PROGRESS_FLOOR: Record<Status, number> = {
  queued: 5,
  building: 18,
  signing: 78,
  ready: 100,
  failed: 100,
};
/** Hard ceiling while a build is still running; we only hit 100 on ready. */
const PROGRESS_CEIL = 95;
/** Bar tick interval. Faster than the 3s status poll so the bar feels live. */
const PROGRESS_TICK_MS = 400;

function humanBytes(n?: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(s: Status): string {
  switch (s) {
    case "queued":
      return "Queued";
    case "building":
      return "Building";
    case "signing":
      return "Signing";
    case "ready":
      return "Ready";
    case "failed":
      return "Failed";
  }
}

export default function MobileAppPanel() {
  const [mobileApp, setMobileApp] = useState<MobileApp | null>(null);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [form, setForm] = useState<Partial<MobileApp>>({});
  const pollRef = useRef<number | null>(null);
  // Smooth, always-moving progress percent for the active build's bar. The
  // server only reports three discrete statuses, so without this the bar
  // would sit at the same number for ~60s and look frozen.
  const [progress, setProgress] = useState(0);
  const progressTickRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(withBasePath("/api/admin/build-apk"));
      if (!res.ok) return;
      const d = (await res.json()) as { builds: Build[]; mobileApp: MobileApp };
      setBuilds(d.builds);
      setMobileApp(d.mobileApp);
      // Seed the form with server-side defaults the first time only, so the
      // owner's in-progress edits never get clobbered by a poll.
      setForm((f) => (Object.keys(f).length === 0 ? d.mobileApp : f));
    } catch {
      /* ignore network blips */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll while a build is in flight; back off when nothing is running.
  useEffect(() => {
    const active = builds.some(
      (b) =>
        b.status === "queued" ||
        b.status === "building" ||
        b.status === "signing",
    );
    if (!active) {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    if (pollRef.current) return;
    pollRef.current = window.setInterval(() => void refresh(), 3000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [builds, refresh]);

  // Smooth progress for whichever build is currently active. Each tick we
  // ease toward 95 (asymptotic so it slows as it gets there) plus a small
  // floor speed so the bar never visually stops while a build is in flight.
  // A stage change just raises the floor; the bar interpolates the rest.
  const activeBuild = builds.find(
    (b) =>
      b.status === "queued" ||
      b.status === "building" ||
      b.status === "signing",
  );
  const activeId = activeBuild?.id ?? null;
  const activeStatus = activeBuild?.status ?? null;
  useEffect(() => {
    // No build running. If the most recent build finished successfully
    // briefly hold the bar at 100 so the transition feels complete; then
    // a new "Build" click resets it to 0 via the activeId change.
    if (!activeStatus) {
      if (progressTickRef.current) {
        window.clearInterval(progressTickRef.current);
        progressTickRef.current = null;
      }
      const justFinished = builds[0];
      setProgress(justFinished?.status === "ready" ? 100 : 0);
      return;
    }
    if (activeStatus === "ready") {
      setProgress(100);
      return;
    }
    // Snap UP to the stage floor when entering it (never down: a re-render
    // mid-stage must not yank the bar backwards).
    setProgress((p) => Math.max(p, PROGRESS_FLOOR[activeStatus]));
    if (progressTickRef.current) return;
    progressTickRef.current = window.setInterval(() => {
      setProgress((p) => {
        if (p >= PROGRESS_CEIL) return PROGRESS_CEIL;
        // Asymptotic ease + a steady minimum so the bar always moves.
        const eased = p + (PROGRESS_CEIL - p) * 0.012 + 0.15;
        return Math.min(PROGRESS_CEIL, eased);
      });
    }, PROGRESS_TICK_MS);
    return () => {
      if (progressTickRef.current) {
        window.clearInterval(progressTickRef.current);
        progressTickRef.current = null;
      }
    };
    // builds is included so the "just finished" snapshot above stays fresh.
  }, [activeId, activeStatus, builds]);

  async function startBuild() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await fetch(withBasePath("/api/admin/build-apk"), {
        method: "POST",
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(d.error || "Could not start the build.");
      } else {
        setInfo("Build started. This usually takes 1 to 2 minutes.");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    setError(null);
    setInfo(null);
    setSavingSettings(true);
    try {
      const body: Partial<MobileApp> = { ...form };
      // Never re-send a locked package id: the server ignores it but sending
      // a stale value can confuse the round-trip.
      if (mobileApp?.lockedPackageId) delete body.packageId;
      const res = await fetch(withBasePath("/api/admin/build-apk"), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json()) as { error?: string; mobileApp?: MobileApp };
      if (!res.ok) {
        setError(d.error || "Could not save settings.");
      } else if (d.mobileApp) {
        setMobileApp(d.mobileApp);
        setForm(d.mobileApp);
        setInfo("Settings saved.");
      }
    } finally {
      setSavingSettings(false);
    }
  }

  async function uploadIcon(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "maskableIconUrl" | "monochromeIconUrl",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("preset", "logo");
    const res = await fetch(withBasePath("/api/upload"), {
      method: "POST",
      body: fd,
    });
    const d = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !d.url) {
      setError(d.error || "Upload failed.");
      return;
    }
    setForm((f) => ({ ...f, [field]: d.url }));
  }

  async function deleteBuild(id: string) {
    if (!confirm("Delete this build?")) return;
    await fetch(withBasePath(`/api/admin/build-apk/${id}`), {
      method: "DELETE",
    });
    await refresh();
  }

  const active = builds.find(
    (b) =>
      b.status === "queued" ||
      b.status === "building" ||
      b.status === "signing",
  );
  const ready = builds.find((b) => b.status === "ready");
  const latest = active || ready || builds[0];

  if (!mobileApp) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/60">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status card. The only thing the owner sees on a brand-new install
          is the big "Build" button; once one is running, the same card turns
          into a progress meter; once one is ready, into a Download CTA. */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">
          Android app
        </p>
        <h2 className="mt-1 font-serif text-2xl">
          {latest ? `Version ${latest.appVersion}` : "Build your Android app"}
        </h2>
        <p className="mt-2 text-sm text-white/70">
          We build a signed Android APK from your live site using the free
          PWABuilder service. The app loads your website inside a native
          wrapper, so content updates do not need a rebuild. Site must be
          reachable on the public internet.
        </p>

        {active && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/70">
              <span>{statusLabel(active.status)}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                // 700ms ease bridges the ~400ms tick so the fill flows
                // smoothly instead of stepping.
                className="h-full rounded-full bg-[#c9a961] transition-[width] duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-white/50">
              First build takes about 60 to 120 seconds. Leave this tab open.
            </p>
          </div>
        )}

        {!active && ready && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={withBasePath(`/api/admin/build-apk/${ready.id}/download`)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#c9a961] px-6 py-3 text-sm font-semibold uppercase tracking-widest text-black hover:opacity-90"
            >
              Download APK ({humanBytes(ready.apkSizeBytes)})
            </a>
            <button
              onClick={startBuild}
              disabled={busy}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white/85 hover:bg-white/10 disabled:opacity-50"
            >
              Build a new version
            </button>
          </div>
        )}

        {!active && !ready && (
          <button
            onClick={startBuild}
            disabled={busy}
            className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#c9a961] px-6 py-3 text-sm font-semibold uppercase tracking-widest text-black hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Starting…" : "Build my Android app"}
          </button>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
        {info && !error && (
          <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {info}
          </p>
        )}
      </div>

      {/* Branding form. Defaults are populated from the business identity and
          theme, so a tenant can hit Build without filling a single field. */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="font-serif text-xl">App branding</h3>
        <p className="mt-1 text-sm text-white/60">
          These values are read by Android the first time the app is opened.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="App name (full)">
            <input
              type="text"
              value={form.appName ?? ""}
              maxLength={50}
              onChange={(e) => setForm({ ...form, appName: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Launcher name (short, max 12 chars)">
            <input
              type="text"
              value={form.launcherName ?? ""}
              maxLength={12}
              onChange={(e) =>
                setForm({ ...form, launcherName: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field
            label={`Package id ${mobileApp.lockedPackageId ? "(locked after first build)" : ""}`}
            hint="Cannot change once the app is published. Use the reverse-domain form like com.yoursalon.app."
          >
            <input
              type="text"
              value={form.packageId ?? ""}
              disabled={mobileApp.lockedPackageId}
              onChange={(e) => setForm({ ...form, packageId: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Theme color">
            <input
              type="color"
              value={form.themeColor ?? "#c9a961"}
              onChange={(e) =>
                setForm({ ...form, themeColor: e.target.value })
              }
              className="h-10 w-full cursor-pointer rounded-lg border border-white/15 bg-transparent"
            />
          </Field>
          <Field label="Background color">
            <input
              type="color"
              value={form.backgroundColor ?? "#0a0806"}
              onChange={(e) =>
                setForm({ ...form, backgroundColor: e.target.value })
              }
              className="h-10 w-full cursor-pointer rounded-lg border border-white/15 bg-transparent"
            />
          </Field>
          <Field label="Dark navigation color">
            <input
              type="color"
              value={form.darkColor ?? "#0a0806"}
              onChange={(e) => setForm({ ...form, darkColor: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-lg border border-white/15 bg-transparent"
            />
          </Field>
          <Field
            label="Maskable icon (512x512 PNG)"
            hint="Optional. Falls back to your site icon if not set."
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => uploadIcon(e, "maskableIconUrl")}
              className="text-xs text-white/70"
            />
            {form.maskableIconUrl && (
              <span className="mt-1 block text-xs text-white/50">
                Saved: {form.maskableIconUrl}
              </span>
            )}
          </Field>
          <Field
            label="Monochrome icon (optional)"
            hint="Used for themed icons on Android 13+."
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => uploadIcon(e, "monochromeIconUrl")}
              className="text-xs text-white/70"
            />
            {form.monochromeIconUrl && (
              <span className="mt-1 block text-xs text-white/50">
                Saved: {form.monochromeIconUrl}
              </span>
            )}
          </Field>
        </div>

        <label className="mt-5 flex items-center gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            checked={form.installPageEnabled ?? false}
            onChange={(e) =>
              setForm({ ...form, installPageEnabled: e.target.checked })
            }
            className="h-4 w-4 accent-[#c9a961]"
          />
          Publish the install page at <code className="ml-1 rounded bg-black/30 px-1 py-0.5 text-xs">/install</code> so you can share one URL with your customers.
        </label>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black hover:opacity-90 disabled:opacity-50"
          >
            {savingSettings ? "Saving…" : "Save settings"}
          </button>
          <button
            onClick={() => setForm(mobileApp)}
            className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Previous builds. Capped at the most recent ten; older successful
          builds and their APKs are purged automatically. */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="font-serif text-xl">Previous builds</h3>
        {builds.length === 0 && (
          <p className="mt-2 text-sm text-white/60">No builds yet.</p>
        )}
        {builds.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-white/50">
                  <th className="pb-2">When</th>
                  <th className="pb-2">Version</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Size</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {builds.map((b) => (
                  <tr key={b.id} className="border-t border-white/10">
                    <td className="py-3 text-white/80">
                      {new Date(b.startedAt).toLocaleString()}
                    </td>
                    <td className="py-3 font-mono text-xs text-white/70">
                      {b.appVersion}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                          b.status === "ready"
                            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                            : b.status === "failed"
                              ? "border-red-400/40 bg-red-500/10 text-red-300"
                              : "border-amber-400/40 bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {statusLabel(b.status)}
                      </span>
                      {b.error && (
                        <p className="mt-1 text-xs text-red-200">{b.error}</p>
                      )}
                    </td>
                    <td className="py-3 text-white/70">
                      {humanBytes(b.apkSizeBytes)}
                    </td>
                    <td className="py-3 text-right">
                      {b.status === "ready" && (
                        <a
                          href={withBasePath(
                            `/api/admin/build-apk/${b.id}/download`,
                          )}
                          className="mr-2 rounded-full border border-[#c9a961]/40 bg-[#c9a961]/10 px-3 py-1 text-[10px] uppercase tracking-widest text-[#c9a961] hover:bg-[#c9a961]/20"
                        >
                          Download
                        </a>
                      )}
                      <button
                        onClick={() => deleteBuild(b.id)}
                        className="rounded-full border border-red-400/30 px-3 py-1 text-[10px] uppercase tracking-widest text-red-300 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help. Two short subsections so a brand-new owner can ship the APK
          to their phone in the next five minutes. */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="font-serif text-xl">How to use your APK</h3>

        <details className="mt-4 group">
          <summary className="cursor-pointer text-sm font-medium text-white/85">
            Sideload on Android (for testing)
          </summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-white/70">
            <li>Send the downloaded APK to your phone (WhatsApp, email, USB).</li>
            <li>Open your phone Settings, search for &quot;Install unknown apps&quot;.</li>
            <li>Allow your file manager or browser to install apps.</li>
            <li>Tap the APK file, confirm, and the app installs.</li>
          </ol>
        </details>

        <details className="mt-3 group">
          <summary className="cursor-pointer text-sm font-medium text-white/85">
            Publish to Google Play (25 euro one-time)
          </summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-white/70">
            <li>Open <a className="text-[#c9a961] underline" target="_blank" rel="noopener" href="https://play.google.com/console">play.google.com/console</a> and create a developer account (25 euro, one-time).</li>
            <li>Create a new app, fill the listing (name, screenshots, description).</li>
            <li>Upload the APK from this page to a new Production release.</li>
            <li>Submit for review. Google usually approves within a few days.</li>
            <li>Every time you rebuild here the version code goes up automatically, so Play accepts the update.</li>
          </ol>
        </details>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/40 disabled:opacity-60";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs text-white/70">
      <span className="block uppercase tracking-widest">{label}</span>
      {hint && <span className="mt-0.5 block text-[10px] text-white/40">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

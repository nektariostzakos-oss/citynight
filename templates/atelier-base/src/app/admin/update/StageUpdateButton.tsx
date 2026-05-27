"use client";

import { useState } from "react";

type StageResult = {
  ok: true;
  stageDir: string;
  appDir: string;
  fromVersion: string;
  toVersion: string;
  files: number;
  carried: string[];
};

function Cmd({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-sm text-white/90">
      {children}
    </div>
  );
}

export default function StageUpdateButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/update/stage", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(
          (data && data.message) ||
            "The update could not be staged. Use the manual ZIP steps below."
        );
      } else {
        setResult(data as StageResult);
      }
    } catch {
      setError("Something went wrong reaching the updater. Use the manual ZIP steps below.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div>
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/[0.08] p-4 text-sm text-emerald-200">
          ✓ Update v{result.toVersion} staged. {result.files} files unpacked, and your{" "}
          {result.carried.join(" + ") || "data"} copied across. Nothing live has changed yet.
        </p>
        <p className="mt-5 text-sm text-white/65">
          The new version is ready in a folder next to your install. Finish with these steps when
          you're ready for ~5-30 seconds of downtime:
        </p>
        <ol className="mt-4 space-y-3 text-sm text-white/75">
          <li>
            <span className="text-[#c9a961]">1.</span> Stop the Node app from your hosting panel.
          </li>
          <li>
            <span className="text-[#c9a961]">2.</span> Swap the folders, then install and build:
            <Cmd>
              mv {result.appDir} {result.appDir}-old
              <br />
              mv {result.stageDir} {result.appDir}
              <br />
              cd {result.appDir} && npm install && npm run build
            </Cmd>
          </li>
          <li>
            <span className="text-[#c9a961]">3.</span> Start the Node app again.
          </li>
          <li>
            <span className="text-[#c9a961]">4.</span> If anything looks wrong, roll back instantly:
            stop the app, then{" "}
            <code className="font-mono text-white">mv {result.appDir} {result.appDir}-failed</code>{" "}
            and <code className="font-mono text-white">mv {result.appDir}-old {result.appDir}</code>,
            and start it again. Once the update looks good after a day or two, delete the{" "}
            <code className="font-mono text-white">-old</code> folder.
          </li>
        </ol>
        <button
          onClick={run}
          className="mt-5 rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10"
        >
          Re-stage
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-white/65">
        Downloads the new version and unpacks it into a folder next to your install, with a copy of
        all your bookings, clients, orders, settings, and uploads carried across. Your live site is
        not touched. You finish with one folder swap and a restart.
      </p>
      <button
        onClick={run}
        disabled={busy}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#c9a961] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-black transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Downloading and staging…" : "Download & stage update"}
      </button>
      {busy && (
        <p className="mt-3 text-xs text-white/45">
          Fetching and unpacking the new version. This can take up to a minute. Keep this tab open.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/[0.08] p-4 text-sm text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}

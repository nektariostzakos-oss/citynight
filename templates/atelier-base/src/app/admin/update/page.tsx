import { getBaseRoot } from "@/lib/appRoot";
import Link from "next/link";
import StageUpdateButton from "./StageUpdateButton";
import { promises as fs } from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";
import { currentUser } from "../../../lib/auth";

export const metadata = {
  title: "Update · Admin",
  robots: { index: false, follow: false },
};

const UPSTREAM =
  process.env.ATELIER_VERSION_URL ||
  process.env.NEXT_PUBLIC_ATELIER_VERSION_URL ||
  "https://atelier.mindscrollers.com/api/template-version";

async function localVersion(): Promise<string> {
  const override = (process.env.ATELIER_OVERRIDE_CURRENT || "").trim();
  if (override) return override;
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(getBaseRoot(), "package.json"), "utf-8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

type Upstream = {
  latest: string;
  repoUrl: string;
  changelogUrl: string;
  releasedAt: string | null;
  title: string | null;
  notes: string;
};

async function upstream(): Promise<Upstream> {
  try {
    const r = await fetch(UPSTREAM, { cache: "no-store" });
    if (!r.ok) throw new Error("unreachable");
    const d = (await r.json()) as Partial<Upstream>;
    return {
      latest: d.latest || "—",
      repoUrl: d.repoUrl || "",
      changelogUrl: d.changelogUrl || "",
      releasedAt: d.releasedAt ?? null,
      title: d.title ?? null,
      notes: d.notes ?? "",
    };
  } catch {
    return { latest: "—", repoUrl: "", changelogUrl: "", releasedAt: null, title: null, notes: "" };
  }
}

/** Tiny markdown → HTML renderer for changelog excerpts.
 * Handles `### heading`, `- bullet`, `**bold**`, paragraph breaks. Plain text only —
 * no scripts, no anchors, so safe to inject. */
function renderNotes(md: string): string {
  if (!md) return "";
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split(/\n/);
  const out: string[] = [];
  let listOpen = false;
  const closeList = () => {
    if (listOpen) {
      out.push("</ul>");
      listOpen = false;
    }
  };
  const formatInline = (s: string) =>
    escape(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      closeList();
      out.push(`<h3 class="mt-6 mb-2 font-serif text-lg text-[var(--gold)]">${formatInline(h3[1])}</h3>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (!listOpen) {
        out.push('<ul class="space-y-1.5 text-sm text-white/75">');
        listOpen = true;
      }
      out.push(`<li class="pl-3">${formatInline(bullet[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p class="text-sm text-white/70">${formatInline(line)}</p>`);
  }
  closeList();
  return out.join("\n");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default async function UpdatePage() {
  const me = await currentUser();
  if (!me) redirect("/admin/login");

  const [current, up] = await Promise.all([localVersion(), upstream()]);
  const { latest, repoUrl, changelogUrl, releasedAt, title, notes } = up;

  const cmp = (a: string, b: string) => {
    const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
    const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const ai = pa[i] ?? 0;
      const bi = pb[i] ?? 0;
      if (ai > bi) return 1;
      if (ai < bi) return -1;
    }
    return 0;
  };
  const updateAvailable = latest !== "—" && cmp(latest, current) > 0;

  const gitPullCommand = "git pull && npm install && npm run build";

  return (
    <div className="min-h-screen bg-[#0a0806] text-white">
      <header className="border-b border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961] sm:text-xs">Update</p>
            <h1 className="mt-0.5 font-serif text-xl font-semibold sm:mt-1 sm:text-2xl">
              {updateAvailable ? "A new version is available" : "You're up to date"}
            </h1>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10"
          >
            ← Back to admin
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Version cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[10px] uppercase tracking-widest text-white/50">Your version</p>
            <p className="mt-1 font-mono text-2xl text-white">v{current}</p>
          </div>
          <div
            className={`rounded-2xl border p-5 ${
              updateAvailable
                ? "border-[#c9a961]/40 bg-[#c9a961]/[0.07]"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <p className="text-[10px] uppercase tracking-widest text-white/50">Latest available</p>
            <p className={`mt-1 font-mono text-2xl ${updateAvailable ? "text-[#c9a961]" : "text-white"}`}>
              v{latest}
            </p>
            {releasedAt && (
              <p className="mt-1 text-[10px] uppercase tracking-widest text-white/45">
                Released {formatDate(releasedAt)}
              </p>
            )}
          </div>
        </div>

        {/* Inline release notes — read this BEFORE updating */}
        {updateAvailable && notes && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">
                  Release notes
                </p>
                <h2 className="mt-1 font-serif text-2xl">
                  v{latest}
                  {title ? <span className="text-white/55"> · {title}</span> : null}
                </h2>
              </div>
              {releasedAt && (
                <span className="text-[10px] uppercase tracking-widest text-white/55">
                  {formatDate(releasedAt)}
                </span>
              )}
            </div>
            <div
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderNotes(notes) }}
            />
            {changelogUrl && (
              <p className="mt-6 text-xs text-white/55">
                Looking for older versions? See the{" "}
                <a
                  href={changelogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--gold)] underline-offset-4 hover:underline"
                >
                  full changelog ↗
                </a>
                .
              </p>
            )}
          </div>
        )}

        {!updateAvailable && (
          <p className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.08] p-5 text-sm text-emerald-200">
            ✓ You're running the latest version. Check back later. We'll show an update banner in the admin header when a new release is out.
          </p>
        )}

        {updateAvailable && (
          <>
            {/* What's new */}
            <div className="mt-10">
              <h2 className="font-serif text-xl">What's new</h2>
              <p className="mt-2 text-sm text-white/60">
                Browse the full release notes on the public template repository.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {changelogUrl && (
                  <a
                    href={changelogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-widest text-white/80 transition-colors hover:bg-white/10"
                  >
                    View changelog ↗
                  </a>
                )}
                {repoUrl && (
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-widest text-white/80 transition-colors hover:bg-white/10"
                  >
                    Open repo ↗
                  </a>
                )}
              </div>
            </div>

            {/* Path A: staged update */}
            <section className="mt-10 rounded-2xl border border-[#c9a961]/30 bg-[#c9a961]/[0.05] p-6">
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2 className="font-serif text-2xl">Recommended · Staged update</h2>
                <span className="text-[10px] uppercase tracking-widest text-[#c9a961]">One click</span>
              </div>
              <StageUpdateButton />
            </section>

            {/* Path B: git pull */}
            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2 className="font-serif text-2xl">Alternative · Git update</h2>
                <span className="text-[10px] uppercase tracking-widest text-white/50">If you installed via git</span>
              </div>
              <p className="text-sm text-white/65">
                If you installed by running <code className="font-mono text-white">git clone</code>, this is the
                cleanest path. Your <code className="font-mono text-white">data/</code> folder is ignored by git,
                so all your bookings, clients, orders, and settings survive the pull.
              </p>
              <ol className="mt-5 space-y-3 text-sm text-white/75">
                <li>
                  <span className="text-[#c9a961]">1.</span> SSH into your host, or open the Node.js terminal in
                  your hosting panel.
                </li>
                <li>
                  <span className="text-[#c9a961]">2.</span> Run:
                  <div className="mt-2 rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-sm">
                    cd /path/to/your/atelier
                    <br />
                    {gitPullCommand}
                  </div>
                </li>
                <li>
                  <span className="text-[#c9a961]">3.</span> Restart the Node app from your hosting panel (or
                  touch <code className="font-mono text-white">tmp/restart.txt</code> on Passenger hosts).
                </li>
              </ol>
              <p className="mt-5 text-xs text-white/45">
                Total downtime: ~5–30 seconds during the restart.
              </p>
            </section>

            {/* Path C: manual ZIP */}
            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2 className="font-serif text-2xl">Manual · ZIP update</h2>
                <span className="text-[10px] uppercase tracking-widest text-white/50">Fallback</span>
              </div>
              <p className="text-sm text-white/65">
                Use this only if the staged update above could not run on your host. You update by replacing
                the files by hand and keeping your <code className="font-mono text-white">data/</code> folder intact.
              </p>
              <ol className="mt-5 space-y-3 text-sm text-white/75">
                <li>
                  <span className="text-[#c9a961]">1.</span>{" "}
                  <strong className="text-white">Back up your data first.</strong> Admin → Settings → Tools →
                  Download backup. Save the JSON snapshot somewhere safe.
                </li>
                <li>
                  <span className="text-[#c9a961]">2.</span> Download the new ZIP from your customer portal:{" "}
                  <a
                    href="https://atelier.mindscrollers.com/support/account"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#c9a961] underline-offset-4 hover:underline"
                  >
                    atelier.mindscrollers.com/support/account
                  </a>
                </li>
                <li>
                  <span className="text-[#c9a961]">3.</span> On your host, rename the existing application
                  folder (don't delete it), e.g. <code className="font-mono text-white">atelier</code> →{" "}
                  <code className="font-mono text-white">atelier-old</code>.
                </li>
                <li>
                  <span className="text-[#c9a961]">4.</span> Extract the new ZIP in place of the old folder.
                </li>
                <li>
                  <span className="text-[#c9a961]">5.</span> Copy the entire <code className="font-mono text-white">data/</code> folder
                  from <code className="font-mono text-white">atelier-old/</code> into the new folder.
                  This preserves bookings, clients, orders, settings, and your gift cards.
                </li>
                <li>
                  <span className="text-[#c9a961]">6.</span> In your host's Node.js terminal:
                  <div className="mt-2 rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-sm">
                    cd /path/to/your/atelier
                    <br />
                    npm install && npm run build
                  </div>
                </li>
                <li>
                  <span className="text-[#c9a961]">7.</span> Restart the Node app from your hosting panel.
                </li>
                <li>
                  <span className="text-[#c9a961]">8.</span> If everything looks good after a day or two, you
                  can delete the <code className="font-mono text-white">atelier-old/</code> folder. If
                  something broke, swap the folder names back to roll forward instantly.
                </li>
              </ol>
            </section>

            {/* Help */}
            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/65">
              Stuck or unsure?{" "}
              <a
                href="https://atelier.mindscrollers.com/support/account"
                className="text-[#c9a961] underline-offset-4 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open a support ticket
              </a>{" "}
              from your customer portal. We'll guide you through.
            </section>
          </>
        )}
      </div>
    </div>
  );
}

#!/usr/bin/env node
/**
 * Production build for the shared Hostinger host.
 *
 * Hostinger's "Max Processes" gauge is CloudLinux NPROC: it counts every THREAD
 * in the account and is shared by every site on it. `next build` runs ON that
 * host (docs/DEPLOYMENT.md), and Turbopack (Tokio) plus swc (rayon) size their
 * pools from the host's ~24 logical CPUs unless told otherwise. Together with
 * `experimental.cpus: 1` in next.config.mjs (static-generation worker
 * processes) this keeps a deploy from breaching the 200-task cap and 503-ing
 * every site on the account.
 *
 * Runs exactly what the old `build` script ran, in order: the database
 * migrations (`tsx db/migrate.ts`), then `next build`. An operator's explicit
 * env value always wins over the defaults below.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// The build needs more V8 heap than the runtime: Next type-checks the whole
// project in-process and a low --max-old-space-size in the panel env (set for
// the RUNTIME process) killed a deploy with "heap out of memory". Keep every
// other NODE_OPTIONS flag (e.g. --v8-pool-size) and guarantee >= 2 GB here.
function buildNodeOptions(raw) {
  const kept = (raw || "").split(/\s+/).filter((f) => f && !f.startsWith("--max-old-space-size"));
  const m = /--max-old-space-size=(\d+)/.exec(raw || "");
  const size = Math.max(2048, m ? Number(m[1]) : 0);
  return [...kept, `--max-old-space-size=${size}`].join(" ");
}

const env = {
  ...process.env,
  NODE_OPTIONS: buildNodeOptions(process.env.NODE_OPTIONS),
  NEXT_TELEMETRY_DISABLED: "1",
  TOKIO_WORKER_THREADS: process.env.TOKIO_WORKER_THREADS || "2",
  RAYON_NUM_THREADS: process.env.RAYON_NUM_THREADS || "2",
  UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE || "2",
};

const steps = [
  // tsx exports its CLI as "tsx/cli"; the file path tsx/dist/cli.mjs is not in
  // its package exports, so require.resolve on it throws ERR_PACKAGE_PATH_NOT_EXPORTED.
  ["db migrate", [require.resolve("tsx/cli"), "db/migrate.ts"]],
  // The SQLite file lives outside the deploy path, so a push carries code and
  // no content. This installs the tracked city guides before the build reads
  // them, which is what makes a deploy ship a city that has something in it.
  ["content seed", [require.resolve("tsx/cli"), "db/seed-city-guides.ts"]],
  ["next build", [require.resolve("next/dist/bin/next"), "build"]],
];

for (const [label, args] of steps) {
  console.log(`\n[hostinger-build] ${label} ...`);
  const r = spawnSync(process.execPath, args, { stdio: "inherit", env });
  if (r.error) {
    console.error(`[hostinger-build] ${label} could not start: ${r.error.message}`);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error(`[hostinger-build] ${label} failed (exit ${r.status ?? r.signal})`);
    process.exit(r.status || 1);
  }
}

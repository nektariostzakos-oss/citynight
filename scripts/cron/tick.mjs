#!/usr/bin/env node
/**
 * ONE crontab entry for the whole site:
 *
 *   *\/5 * * * *  cd ~/domains/citynight.gr/public_html && node scripts/cron/tick.mjs
 *
 * Every five minutes this decides which of the scheduled jobs are due (same
 * schedule as the old eleven-line crontab in docs/CRON.md) and runs them ONE AT
 * A TIME, each with its own log file and a hard timeout.
 *
 * Why: Hostinger's "Max Processes" gauge is CloudLinux NPROC, counts every
 * THREAD in the account, and is shared by every site on it. The old crontab
 * launched up to three Node processes at the same minute (~30-36 tasks at :15)
 * plus bash/curl chains, with no lock and no timeout, so a hung Places or
 * Resend call piled overlapping runs on top of the live server and everything
 * else on the account. Sequential execution caps the cron footprint at one
 * child at a time, the lock stops overlapping ticks, and each child gets a
 * small thread pool.
 *
 * Env: the children inherit this process's environment, so the crontab still
 * carries the globals (DATABASE_PATH, API keys, ...) exactly as before.
 * CRON_LOG_DIR overrides the log directory (default ~/logs).
 * CITYNIGHT_TICK_UPTIME=0 skips the uptime sentinel (use an external monitor).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOG_DIR = process.env.CRON_LOG_DIR || path.join(os.homedir(), "logs");
const LOCK_DIR = path.join(os.tmpdir(), "citynight-cron-tick.lock");
const LOCK_STALE_MS = 25 * 60 * 1000;
const LOG_MAX_BYTES = 5 * 1024 * 1024;

const now = new Date();
const minute = now.getMinutes();
const hour = now.getHours();
const dow = now.getDay(); // 0 = Sunday

const MIN = 60 * 1000;
const cronScript = (file) => path.join(ROOT, "scripts", "cron", file);
const node = (file) => [process.execPath, cronScript(file)];
const bash = (file) => ["bash", cronScript(file)];

/** Same schedule as the retired crontab; `when` is evaluated once per tick. */
const JOBS = [
  { name: "booking-reminders", when: minute % 5 === 0, cmd: node("booking-reminders.mjs"), timeoutMs: 4 * MIN },
  { name: "notify-published", when: minute % 15 === 0, cmd: node("notify-published.js"), timeoutMs: 4 * MIN },
  { name: "rollup", when: minute === 5, cmd: node("rollup-analytics.js"), timeoutMs: 10 * MIN },
  { name: "review-requests", when: minute === 15, cmd: node("review-requests.mjs"), timeoutMs: 4 * MIN },
  { name: "translation-backfill", when: dow === 3 && hour === 2 && minute === 0, cmd: node(path.join("..", "translations", "backfill.js")), timeoutMs: 20 * MIN },
  { name: "backup", when: hour === 3 && minute === 0, cmd: bash("backup-db.sh"), timeoutMs: 10 * MIN },
  { name: "backup-verify", when: hour === 4 && minute === 0, cmd: bash("backup-verify.sh"), env: { DATABASE_PATH: process.env.DATABASE_PATH || "" }, timeoutMs: 10 * MIN },
  { name: "sync", when: dow === 1 && hour === 4 && minute === 0, cmd: node("sync.js"), timeoutMs: 20 * MIN },
  { name: "reconcile", when: hour === 4 && minute === 30, cmd: node("reconcile.js"), timeoutMs: 10 * MIN },
  { name: "weekly-digest", when: dow === 0 && hour === 9 && minute === 0, cmd: node("weekly-digest.js"), timeoutMs: 10 * MIN },
  // Last, and optional: five sequential curls plus python on failure. An
  // external uptime monitor does this job without spending our processes.
  { name: "uptime", when: minute % 5 === 0 && process.env.CITYNIGHT_TICK_UPTIME !== "0", cmd: bash("uptime-check.sh"), timeoutMs: 2 * MIN },
];

function stamp() {
  return new Date().toISOString();
}

function openLog(name) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const file = path.join(LOG_DIR, `${name}.log`);
  try {
    if (fs.statSync(file).size > LOG_MAX_BYTES) fs.renameSync(file, `${file}.1`);
  } catch {
    /* no file yet */
  }
  return fs.openSync(file, "a");
}

function tickLog(line) {
  try {
    const fd = openLog("tick");
    fs.writeSync(fd, `${stamp()} ${line}\n`);
    fs.closeSync(fd);
  } catch {
    /* best effort */
  }
}

function acquireLock() {
  try {
    fs.mkdirSync(LOCK_DIR);
    return true;
  } catch {
    try {
      const age = Date.now() - fs.statSync(LOCK_DIR).mtimeMs;
      if (age > LOCK_STALE_MS) {
        fs.rmSync(LOCK_DIR, { recursive: true, force: true });
        fs.mkdirSync(LOCK_DIR);
        tickLog(`stale lock (${Math.round(age / MIN)} min) replaced`);
        return true;
      }
    } catch {
      /* fall through */
    }
    return false;
  }
}

function releaseLock() {
  fs.rmSync(LOCK_DIR, { recursive: true, force: true });
}

function runJob(job) {
  return new Promise((resolve) => {
    const fd = openLog(job.name);
    fs.writeSync(fd, `\n${stamp()} [tick] start ${job.name}\n`);
    const [bin, ...args] = job.cmd;
    const started = Date.now();
    const child = spawn(bin, args, {
      cwd: ROOT,
      stdio: ["ignore", fd, fd],
      env: {
        ...process.env,
        ...(job.env || {}),
        // Every child is a fresh Node process; keep its pools small too.
        UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE || "1",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fs.writeSync(fd, `${stamp()} [tick] end ${job.name} ${result} in ${Date.now() - started}ms\n`);
      fs.closeSync(fd);
      resolve(result);
    };
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* already gone */
      }
      finish(`TIMEOUT after ${job.timeoutMs}ms`);
    }, job.timeoutMs);
    child.on("error", (err) => finish(`spawn error: ${err.message}`));
    child.on("exit", (code, signal) => finish(code === 0 ? "ok" : `exit ${code ?? signal}`));
  });
}

async function main() {
  const due = JOBS.filter((j) => j.when);
  if (due.length === 0) return;
  if (!acquireLock()) {
    tickLog(`skipped (previous tick still running): ${due.map((j) => j.name).join(", ")}`);
    return;
  }
  try {
    const summary = [];
    for (const job of due) {
      const result = await runJob(job);
      summary.push(`${job.name}=${result}`);
    }
    tickLog(summary.join(" "));
  } finally {
    releaseLock();
  }
}

main().catch((err) => {
  tickLog(`tick failed: ${err && err.stack ? err.stack : err}`);
  process.exitCode = 1;
});

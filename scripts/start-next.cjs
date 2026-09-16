#!/usr/bin/env node
/**
 * `next start`, with the process's thread pools capped first.
 *
 * Hostinger's "Max Processes" gauge is CloudLinux NPROC: it counts every
 * THREAD in the account, shared by every site on it. A bare Node process
 * already costs ~11 tasks (main, 4 libuv workers, 4 V8 workers, GC helpers);
 * libuv sizes its pool on first use and reads UV_THREADPOOL_SIZE then, so the
 * first statements of the entry file are early enough to shrink it. V8's own
 * pool (--v8-pool-size) is fixed before any JS runs and belongs in the hPanel
 * NODE_OPTIONS field instead (see DEPLOY.md).
 *
 * Use as the hPanel entry file (`scripts/start-next.cjs`) or via `npm start`.
 * Any extra arguments are passed through to `next start` (e.g. `-p 3000`).
 */
if (!process.env.UV_THREADPOOL_SIZE) process.env.UV_THREADPOOL_SIZE = "2";
if (!process.env.VIPS_CONCURRENCY) process.env.VIPS_CONCURRENCY = "1";
process.env.NEXT_TELEMETRY_DISABLED = "1";
if (!process.env.NODE_ENV) process.env.NODE_ENV = "production";

const nextBin = require.resolve("next/dist/bin/next");
process.argv = [process.argv[0], nextBin, "start", ...process.argv.slice(2)];
require(nextBin);

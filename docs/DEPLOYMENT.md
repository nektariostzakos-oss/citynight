# Deployment — Hostinger CloudLinux Node + Cloudflare

## 1. One-time provisioning on Hostinger

1. Create a Node.js app in hPanel (Node ≥ 20.11, preferably 22.x so the `node:sqlite` fallback is available even if `better-sqlite3` prebuilt binaries skip).
2. **Persistent SQLite directory — LAW (§4).** Create a dir *outside* the deploy path:
   ```sh
   mkdir -p /home/uXXX/persistent
   chmod 700 /home/uXXX/persistent
   ```
3. Set the app's startup file to `node_modules/next/dist/bin/next` with argument `start` and port 3000 (Hostinger maps it).
4. Set environment variables in hPanel from `.env.example`. **Critical:**
   - `DATABASE_PATH=/home/uXXX/persistent/citynight.sqlite`
   - `NEXT_PUBLIC_SITE_URL=https://citynight.gr`
   - `STRIPE_WEBHOOK_SECRET` — copy from Stripe Dashboard once the endpoint is registered (step 4 below).

## 2. Cloudflare in front

- DNS: A/AAAA records for `citynight.gr` and `www` → Hostinger IP. Orange-cloud (proxied) ON.
- SSL/TLS mode: **Full (strict)**.
- Page Rules / Cache Rules:
   - Cache everything for `*.citynight.gr/*` except `/api/*` and `/*/dashboard/*` and `/*/claim/*` (bypass cache).
   - Always set `Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=86400` via Transform Rules for HTML.
- `CF-IPCountry` is provided automatically — `lib/geo.ts` reads it.

## 3. First deploy

From local machine, push to the production git remote configured in hPanel **or** upload via Hostinger Git Deploy.

After upload, SSH in and run:
```sh
cd ~/domains/citynight.gr/public_html
pnpm install --prod=false --frozen-lockfile
pnpm build
pnpm db:migrate           # idempotent
pnpm start                 # or restart via hPanel
```

> Re-runnable. Migrations are recorded in `_migrations`; FTS5 triggers are `CREATE IF NOT EXISTS`.

## 4. Stripe webhook

In Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://citynight.gr/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Copy the signing secret → `STRIPE_WEBHOOK_SECRET` env on Hostinger, restart app.

Create the Featured price → set its id in `STRIPE_PRICE_FEATURED_MONTHLY` env.

## 5. Seed pipeline (one-time)

```sh
cd scripts/seed
pnpm install
# Verify integrity test BEFORE running enrich.
node tests/enrichment-writer.test.js
# Dry-run one city.
node run.js all --city=mykonos --dry-run
# Then real:
node run.js ingest --city=mykonos
node run.js enrich --city=mykonos
node run.js photos --city=mykonos
node run.js gate
```

Repeat city-by-city to keep Places + Anthropic spend predictable (§17).

## 6. Cron jobs

See `CRON.md` for the exact crontab lines.

## 7. Rollback

- `pnpm db:migrate` does NOT auto-revert. Migrations only forward-apply. If a migration is bad, restore the most recent gzipped backup from `$BACKUP_DIR`:
   ```sh
   gunzip -c ~/persistent/backups/citynight-YYYYMMDD-HHMMSS.sqlite.gz > /tmp/restore.sqlite
   sqlite3 "$DATABASE_PATH" ".restore '/tmp/restore.sqlite'"
   pnpm restart   # or hPanel restart
   ```

## 8. Process budget on the shared account (2026-09-04)

Hostinger's "Max Processes" gauge is CloudLinux NPROC: every THREAD of every site on
the account counts against one cap of 200. Keep this app at one instance and:

- **Build**: `npm run build` now runs `scripts/hostinger-build.mjs` (migrations, then
  `next build` with `TOKIO_WORKER_THREADS=2 RAYON_NUM_THREADS=2 UV_THREADPOOL_SIZE=2`), and
  `next.config.mjs` sets `experimental.cpus: 1`. Without both, one on-host build forked ~23
  worker processes (~230 tasks) and 503-ed every site on the account.
- **Start**: prefer `scripts/start-next.cjs` as the hPanel entry file (or `node server.js`);
  both set `UV_THREADPOOL_SIZE=2` before Next loads. If the entry stays
  `node_modules/next/dist/bin/next start`, add `UV_THREADPOOL_SIZE=2` as an hPanel env var.
- **hPanel env**: `NODE_OPTIONS=--v8-pool-size=1 --max-old-space-size=512`,
  `UV_THREADPOOL_SIZE=2`, `NEXT_TELEMETRY_DISABLED=1`, `UPLOADS_PATH=/home/uXXX/persistent/uploads`
  (uploads inside the deploy dir are wiped on redeploy).
- **Cron**: one line, see docs/CRON.md (`scripts/cron/tick.mjs`).
- **Images**: the optimizer is off (`images.unoptimized`); the old `hostname: **` allowlist was
  an open image proxy and a sharp encode per foreign URL.

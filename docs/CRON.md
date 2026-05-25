# Cron jobs (Hostinger cron tab)

Each entry assumes:
- `~/domains/citynight.gr/public_html` is the deploy directory.
- `DATABASE_PATH` is exported (set globally in hPanel **and** at the top of crontab for safety).
- Logs in `~/logs/`.

## Crontab

```cron
# Globals (Hostinger crontab honours these).
DATABASE_PATH=/home/uXXX/persistent/citynight.sqlite
PATH=/usr/local/bin:/usr/bin:/bin
HOME=/home/uXXX
ANTHROPIC_API_KEY=...
GOOGLE_PLACES_API_KEY=...
STRIPE_SECRET_KEY=...

# Hourly: roll up raw `events` rows into `events_daily`.
5 * * * *  cd ~/domains/citynight.gr/public_html && node scripts/cron/rollup-analytics.js >> ~/logs/rollup.log 2>&1

# Daily 03:00: gzipped SQLite backup, keeps 14 days.
0 3 * * *  ~/domains/citynight.gr/public_html/scripts/cron/backup-db.sh >> ~/logs/backup.log 2>&1

# Daily 04:30: reconcile Stripe live vs DB; non-zero exit ⇒ cron mail.
30 4 * * *  cd ~/domains/citynight.gr/public_html && node scripts/cron/reconcile.js >> ~/logs/reconcile.log 2>&1

# Weekly Mon 04:00: Places sync — facts, photos, close-detection, auto-resolve reports.
0 4 * * 1  cd ~/domains/citynight.gr/public_html && node scripts/cron/sync.js >> ~/logs/sync.log 2>&1

# Every 15 minutes: email owners whose venues flipped to published since last tick.
*/15 * * * *  cd ~/domains/citynight.gr/public_html && node scripts/cron/notify-published.js >> ~/logs/notify-published.log 2>&1
```

## Verification checklist (run after first deploy)

- [ ] `node scripts/cron/rollup-analytics.js` — exits 0, prints "rolled up N tuples".
- [ ] `scripts/cron/backup-db.sh` — produces a `.sqlite.gz` in `$DATABASE_PATH/../backups/`.
- [ ] `node scripts/cron/reconcile.js` — exits 0 when nothing is drifted.
- [ ] `node scripts/cron/sync.js` — exits 0; rerun is safe.

## What writes to SQLite

| Surface | Writes |
| --- | --- |
| Public site | analytics events only (`events`) |
| Auth route handlers | `users`, `sessions`, `magic_tokens` |
| Claim/submission handlers | `venues` (status, claim, owner_id, slug), `claims`, `venue_submissions` |
| Owner-edit PATCH | venue editable cols + `field_sources['owner']` |
| Stripe webhook | `subscriptions`, `venues.tier` |
| Seed pipeline | venue facts, photos, descriptions (via EnrichmentWriter), gate transitions |
| Cron `sync.js` | venue facts (respecting `field_sources='owner'`), photos, status='closed', reports → 'resolved' |
| Cron `rollup-analytics.js` | `events_daily`, deletes old `events` rows |

The EnrichmentWriter is the ONLY writer for `venues.description` from the AI path. The photos CHECK constraint blocks AI/stock on real venues.

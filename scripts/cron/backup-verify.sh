#!/bin/bash
# Verifies the most recent gzipped backup actually restores to a working
# SQLite file. Catches the classic "backups exist but are corrupt" failure
# mode where the cron rolls every day but nobody ever tried to restore one.
#
# Procedure:
#   1. Pick the newest *.sqlite.gz in $BACKUP_DIR.
#   2. gunzip it to a tmp file.
#   3. Run `PRAGMA integrity_check` (returns 'ok' on a healthy DB).
#   4. Run a smoke query: SELECT COUNT(*) FROM cities — must be > 0.
#   5. Compare row count against the live DB (sanity threshold: ≥95%).
#   6. Delete the tmp file.
#
# Exit code 0 on success, non-zero on any failure; the cron pipes stderr to
# the log so failures are visible the next morning.
#
# Required env:
#   DATABASE_PATH     path to the live SQLite (same env the app uses)
#   BACKUP_DIR        defaults to "$(dirname DATABASE_PATH)/../backups"

set -euo pipefail

: "${DATABASE_PATH:?DATABASE_PATH required}"
: "${BACKUP_DIR:=$(dirname "$DATABASE_PATH")/backups}"

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "[backup-verify] no backup dir at $BACKUP_DIR" >&2
  exit 1
fi

latest=$(ls -1t "$BACKUP_DIR"/*.sqlite.gz 2>/dev/null | head -n1)
if [[ -z "$latest" ]]; then
  echo "[backup-verify] no *.sqlite.gz backups found in $BACKUP_DIR" >&2
  exit 1
fi

age_seconds=$(( $(date +%s) - $(stat -c %Y "$latest") ))
age_hours=$(( age_seconds / 3600 ))
if [[ $age_hours -gt 30 ]]; then
  echo "[backup-verify] latest backup is ${age_hours}h old (>30h) — backup cron may be broken" >&2
  exit 1
fi

tmp="$(mktemp --suffix=.sqlite)"
trap 'rm -f "$tmp"' EXIT

echo "[backup-verify] restoring $latest → $tmp"
gunzip -c "$latest" > "$tmp"

# Integrity check.
integrity=$(sqlite3 "$tmp" 'PRAGMA integrity_check;')
if [[ "$integrity" != "ok" ]]; then
  echo "[backup-verify] integrity_check failed: $integrity" >&2
  exit 2
fi

# Smoke counts.
cities_backup=$(sqlite3 "$tmp" 'SELECT COUNT(*) FROM cities;')
cities_live=$(sqlite3 "$DATABASE_PATH" 'SELECT COUNT(*) FROM cities;')
venues_backup=$(sqlite3 "$tmp" "SELECT COUNT(*) FROM venues WHERE status='published';")
venues_live=$(sqlite3 "$DATABASE_PATH" "SELECT COUNT(*) FROM venues WHERE status='published';")

echo "[backup-verify] cities backup=$cities_backup live=$cities_live, venues_pub backup=$venues_backup live=$venues_live"

# Threshold: backup must carry ≥95% of live rows. Drops below that signal
# a backup taken mid-import or after a destructive operation we didn't expect.
threshold_cities=$(( cities_live * 95 / 100 ))
threshold_venues=$(( venues_live * 95 / 100 ))
if [[ $cities_backup -lt $threshold_cities ]]; then
  echo "[backup-verify] cities row count too low: $cities_backup < $threshold_cities (95% of live)" >&2
  exit 3
fi
if [[ $venues_backup -lt $threshold_venues ]]; then
  echo "[backup-verify] published venues row count too low: $venues_backup < $threshold_venues" >&2
  exit 3
fi

echo "[backup-verify] OK — $(basename "$latest") restores cleanly (age=${age_hours}h)"

# Suggested crontab line (daily at 04:00, after the 03:00 backup completes):
#   0 4 * * *  DATABASE_PATH=/home/uXXX/persistent/citynight.sqlite \
#       /home/uXXX/domains/citynight.gr/public_html/scripts/cron/backup-verify.sh \
#       >> ~/logs/backup-verify.log 2>&1

#!/usr/bin/env bash
# Daily SQLite backup. Uses sqlite3's online .backup so the live WAL-mode DB stays
# unblocked. Keeps the last 14 archives; older ones are pruned.
#
# Cron line (suggested, runs 03:00 local):
#   0 3 * * *  /home/uXXX/citynight.gr/scripts/cron/backup-db.sh >> /home/uXXX/logs/backup.log 2>&1

set -euo pipefail

: "${DATABASE_PATH:?DATABASE_PATH must be set}"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$DATABASE_PATH")/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/citynight-$STAMP.sqlite"

mkdir -p "$BACKUP_DIR"

# sqlite3's online .backup is the only safe way to copy a WAL-mode DB while writers
# may be active. cp would race with checkpoints.
sqlite3 "$DATABASE_PATH" ".backup '$OUT'"

# Compress + rotate (keep 14)
gzip -f "$OUT"
ls -1t "$BACKUP_DIR"/citynight-*.sqlite.gz 2>/dev/null | tail -n +15 | xargs -r rm --

echo "Backup OK → ${OUT}.gz"

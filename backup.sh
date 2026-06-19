#!/usr/bin/env bash
# TFC local daily backup — run manually or via cron
# Usage: ./backup.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
STAMP="$(date -u +%Y-%m-%d)"
BACKUP_ROOT="$ROOT/backups"
DEST="$BACKUP_ROOT/$STAMP"
ARCHIVE="$BACKUP_ROOT/tfc-backup-$STAMP.tar.gz"

mkdir -p "$DEST"

PATHS=(
  index.html serve.py vercel.json start.ps1 start.bat RESTORE.md
  about-us.html blogs.html contact.html crew.html faqs.html
  films.html films-search.html pricing.html workshop.html
  tales-from-the-culture.html
  js css films
)

for rel in "${PATHS[@]}"; do
  src="$ROOT/$rel"
  [[ -e "$src" ]] || continue
  mkdir -p "$DEST/$(dirname "$rel")"
  cp -a "$src" "$DEST/$rel"
done

node "$ROOT/scripts/build-backup-manifest.js" "$DEST/backup-manifest.json"

tar czf "$ARCHIVE" -C "$DEST" .
echo "Backup: $ARCHIVE"

# Keep last 14 daily folders
ls -1dt "$BACKUP_ROOT"/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] 2>/dev/null | tail -n +15 | xargs -r rm -rf
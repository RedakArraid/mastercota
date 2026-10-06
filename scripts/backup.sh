#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
umask 077
backup="backups/mastercota-$(date -u +%Y%m%dT%H%M%SZ).dump"
partial=$(mktemp "backups/.backup.XXXXXX")
trap 'rm -f "$partial"' EXIT
docker compose exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$partial"
test -s "$partial"
mv "$partial" "$backup"
echo "$backup"

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
backup=${1:?Usage: scripts/check-restore.sh backups/fichier.dump}
test -f "$backup"
restore_db="mastercota_restore_$(date -u +%Y%m%d%H%M%S)"
docker compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" "$1"' sh "$restore_db"
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$1" --exit-on-error' sh "$restore_db" < "$backup"
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$1" -v ON_ERROR_STOP=1 -c "SELECT count(*) AS users FROM users; SELECT count(*) AS cotisations FROM cotisations;"' sh "$restore_db"
echo "Restauration vérifiée dans $restore_db. La base principale est inchangée."

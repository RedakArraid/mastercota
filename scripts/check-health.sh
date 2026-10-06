#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose exec -T backend wget -q -O - http://127.0.0.1:4000/ready
docker compose exec -T frontend wget -q --spider http://127.0.0.1:3000/

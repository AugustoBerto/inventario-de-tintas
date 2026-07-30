#!/usr/bin/env bash
set -euo pipefail

output_path="${1:?Uso: npm run db:backup -- /caminho/backup.dump}"
container_name="${POSTGRES_CONTAINER:-test-postgres}"

docker exec "${container_name}" sh -ceu \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  > "${output_path}"

test -s "${output_path}"
echo "Backup criado em ${output_path}"

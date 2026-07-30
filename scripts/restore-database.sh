#!/usr/bin/env bash
set -euo pipefail

dump_path="${1:?Uso: npm run db:restore -- /caminho/backup.dump banco_destino}"
target_database="${2:?Informe um banco de destino novo}"
container_name="${POSTGRES_CONTAINER:-test-postgres}"

if [[ ! "${target_database}" =~ ^[a-zA-Z0-9_]+$ ]]; then
  echo "O banco de destino deve conter apenas letras, números e underscore." >&2
  exit 1
fi

current_database="$(
  docker exec "${container_name}" sh -ceu 'printf "%s" "$POSTGRES_DB"'
)"
if [[ "${target_database}" == "${current_database}" ]]; then
  echo "A restauração sobre o banco ativo é bloqueada. Use um banco novo." >&2
  exit 1
fi

exists="$(
  docker exec "${container_name}" sh -ceu \
    'psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '\''$1'\''"' \
    sh "${target_database}"
)"
if [[ "${exists}" == "1" ]]; then
  echo "O banco ${target_database} já existe; restauração cancelada." >&2
  exit 1
fi

container_dump="/tmp/${target_database}.dump"
created=false
cleanup() {
  docker exec "${container_name}" rm -f "${container_dump}" >/dev/null 2>&1 || true
  if [[ "${created}" == "true" && "${restore_complete:-false}" != "true" ]]; then
    docker exec "${container_name}" sh -ceu \
      'dropdb -U "$POSTGRES_USER" "$1"' sh "${target_database}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

docker cp "${dump_path}" "${container_name}:${container_dump}" >/dev/null
docker exec "${container_name}" sh -ceu \
  'createdb -U "$POSTGRES_USER" "$1"' sh "${target_database}"
created=true
docker exec "${container_name}" sh -ceu \
  'pg_restore -U "$POSTGRES_USER" -d "$1" --exit-on-error --no-owner --no-acl "$2"' \
  sh "${target_database}" "${container_dump}"
docker exec "${container_name}" sh -ceu \
  'psql -U "$POSTGRES_USER" -d "$1" -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) AS migrations FROM migrations"' \
  sh "${target_database}"
restore_complete=true

echo "Backup restaurado e validado no banco ${target_database}"

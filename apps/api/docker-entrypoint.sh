#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  pnpm --filter api migration:run
fi

exec "$@"

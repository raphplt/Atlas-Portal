#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  if [ "${NODE_ENV}" = "production" ]; then
    pnpm --filter api migration:run:prod
  else
    pnpm --filter api migration:run
  fi
fi

exec "$@"

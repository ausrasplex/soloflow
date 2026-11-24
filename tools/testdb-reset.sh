#!/bin/sh
# Test helper for the throwaway container database only (never a real install): recreate, migrate, and seed
# the demo data. With --empty, leave it empty for tools/e2e/first-run.js.
psql -h localhost -U postgres -q -c "DROP DATABASE IF EXISTS soloflow WITH (FORCE);" -c "CREATE DATABASE soloflow OWNER soloflow;" && npx prisma migrate deploy >/dev/null && rm -rf ./backups && if [ "$1" != "--empty" ]; then npx tsx --env-file=.env prisma/seed.ts; fi

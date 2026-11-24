#!/bin/sh
# Container start: check the settings, bring the database up to date, then start SoloFlow.
set -e
if [ -z "$DATABASE_URL" ]; then echo "SoloFlow: set DATABASE_URL (postgresql://user:password@host:5432/soloflow?schema=public)"; exit 1; fi
if [ ${#SOLOFLOW_SECRET} -lt 16 ]; then echo "SoloFlow: set SOLOFLOW_SECRET to a long random string (32+ characters) and keep it safe"; exit 1; fi
tries=0
until node prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma; do
  tries=$((tries + 1))
  if [ "$tries" -ge 10 ]; then echo "SoloFlow: the database is not reachable. Check DATABASE_URL and that PostgreSQL is running."; exit 1; fi
  echo "SoloFlow: waiting for the database ($tries)"; sleep 5
done
exec node server.js

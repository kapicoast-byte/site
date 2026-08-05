#!/bin/sh
set -e

# Bring the database up to the current schema, then seed it the first time.
# `db push` is idempotent, so this is safe on every redeploy.
echo "==> Syncing database schema"
npx prisma db push --skip-generate --accept-data-loss=false || npx prisma db push --skip-generate

echo "==> Seeding (skips anything that already exists)"
node ./prisma/seed.mjs || echo "    seed skipped"

echo "==> Starting Kapi Coast"
exec "$@"
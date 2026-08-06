#!/bin/sh
# Prepare the database, then hand over to the Next server.
#
# Deliberately NOT `set -e`. An unreadable crash loop is the worst outcome
# here: the container dies, the proxy returns a bare 502, and the actual cause
# scrolls past in a restart loop. Failures below are loud but non-fatal, so the
# container stays up and its logs stay readable.

echo "==> Kapi Coast starting"

# Prisma is invoked through node directly rather than `npx`. npx will reach for
# the registry if it cannot resolve a binary locally, which in a container with
# no outbound access either hangs or fails for reasons that look nothing like
# the real problem.
PRISMA="./node_modules/prisma/build/index.js"

if [ ! -f "$PRISMA" ]; then
  echo "!!! Prisma CLI not found at $PRISMA — skipping schema sync."
  echo "!!! The app will start, but every page needing the database will fail."
else
  # Postgres accepts TCP connections slightly before it is ready to serve. The
  # compose healthcheck covers the normal case; this covers the rest.
  echo "==> Waiting for the database"
  i=1
  while [ "$i" -le 30 ]; do
    if node "$PRISMA" db execute --stdin --schema ./prisma/schema.prisma <<'SQL' >/dev/null 2>&1
SELECT 1;
SQL
    then
      echo "    database is up"
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo "!!! Database still unreachable after 30 tries."
      echo "!!! Check DATABASE_URL. Inside compose it must point at the 'db'"
      echo "!!! service by name, e.g. postgresql://kapi:kapi@db:5432/kapicoast"
    fi
    i=$((i + 1))
    sleep 2
  done

  # `db push` is idempotent, so this is safe on every redeploy.
  # No --accept-data-loss flag: it is a boolean, and passing it a value made
  # this command fail every single time and quietly fall through to a retry.
  echo "==> Syncing database schema"
  if node "$PRISMA" db push --skip-generate; then
    echo "    schema in sync"
  else
    echo "!!! Schema sync failed — see the error above. Starting anyway so the"
    echo "!!! container stays up and this log remains readable."
  fi

  echo "==> Seeding (adds only what is missing)"
  if node ./prisma/seed.mjs; then
    echo "    seed complete"
  else
    echo "!!! Seed failed — see above. Continuing."
  fi
fi

echo "==> Handing over to Next"
exec "$@"

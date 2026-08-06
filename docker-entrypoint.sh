#!/bin/sh
# Seed content if missing, then hand over to the Next server.
#
# Much shorter than it used to be. With Postgres there was a schema to push and
# a database to wait for before anything could run; Firestore is schemaless and
# managed, so there is nothing to migrate and nothing to wait on.
#
# Deliberately NOT `set -e`. An unreadable crash loop is the worst outcome
# here: the container dies, the proxy returns a bare 502, and the actual cause
# scrolls past in a restart loop. A failure below is loud but non-fatal, so the
# container stays up and its logs stay readable.

echo "==> Kapi Coast starting"

if [ -z "$FIREBASE_SERVICE_ACCOUNT" ]; then
  echo "!!! FIREBASE_SERVICE_ACCOUNT is not set."
  echo "!!! The site will start but every page will fail — Firestore holds all"
  echo "!!! the content, and admin sign-in needs it too."
elif [ ! -f ./seed/seed.mjs ]; then
  echo "!!! seed/seed.mjs is missing from the image — skipping seed."
else
  echo "==> Seeding (adds only what is missing)"
  if node ./seed/seed.mjs; then
    echo "    seed complete"
  else
    echo "!!! Seed failed — see the error above. Starting anyway so the"
    echo "!!! container stays up and this log remains readable."
  fi
fi

echo "==> Handing over to Next"
exec "$@"

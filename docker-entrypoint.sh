#!/bin/sh
# Start the server, and seed alongside it.
#
# The seed used to run to completion before Next was allowed to start. Measured
# against the real project, that costs ~13 seconds to add *nothing* — it checks
# roughly 155 documents over the network and finds every one already there:
#
#     duration : 12911 ms
#     seeded   : {"categories":0,"menu":0,"posts":0,"pages":0,...}
#
# Every one of those seconds was downtime. Dokploy stops the old container
# before starting the new one, so the proxy has nothing to route to and answers
# "Bad Gateway" until the new container is listening — and it could not listen
# until this had finished. Taking the seed off the critical path removes most
# of that window.
#
# The trade only shows on a genuinely empty project: the site now answers
# before the content has landed, so a first-ever deploy may serve a few thin
# pages for a few seconds. That happens once. The old order charged the delay
# on every deploy, forever.
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
  echo "==> Seeding in the background (adds only what is missing)"
  # Backgrounded, then the shell hands its own process over to Next below. The
  # subshell keeps running and keeps writing to the same stdout, so its output
  # still reaches `docker logs` — interleaved with the server's rather than
  # ahead of it.
  (
    if node ./seed/seed.mjs; then
      echo "==> Seed complete"
    else
      echo "!!! Seed failed — see the error above. The server is already up;"
      echo "!!! content may be missing until this is fixed and redeployed."
    fi
  ) &
fi

echo "==> Handing over to Next"
exec "$@"

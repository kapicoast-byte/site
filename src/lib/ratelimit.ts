import "server-only";
import { headers } from "next/headers";

/**
 * Attempt limiter for the sign-in form.
 *
 * There is exactly one admin account and one password, so an unlimited login
 * form is the whole security model reduced to how fast someone can guess.
 * Eight tries per quarter hour turns a feasible online attack into an
 * infeasible one, while leaving room for a genuinely forgotten password.
 *
 * Held in memory on purpose. This ships as a single container, so a shared
 * store would be infrastructure for no gain. Two consequences worth knowing:
 * the counters reset on redeploy, and if the app is ever scaled to more than
 * one instance each gets its own allowance. At that point move it to Postgres
 * or Redis — the interface below would not change.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

type Bucket = { hits: number; first: number };
const buckets = new Map<string, Bucket>();

/** Drop expired buckets so a long-running process cannot grow without bound. */
function sweep(now: number) {
  for (const [key, b] of buckets) {
    if (now - b.first > WINDOW_MS) buckets.delete(key);
  }
}

/**
 * Best-effort client identity.
 *
 * Behind Dokploy's proxy the socket address is the proxy, so the forwarded
 * header is the only thing that distinguishes callers. It is client-controlled
 * and therefore spoofable — which is why this is a speed bump on guessing, not
 * an access control. The real protection is a long password.
 */
async function clientKey() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export type LimitResult = { ok: true } | { ok: false; retryInMinutes: number };

/** Counts an attempt. Call before checking the password. */
export async function takeLoginAttempt(): Promise<LimitResult> {
  const now = Date.now();
  sweep(now);

  const key = await clientKey();
  const b = buckets.get(key);

  if (!b || now - b.first > WINDOW_MS) {
    buckets.set(key, { hits: 1, first: now });
    return { ok: true };
  }

  b.hits += 1;
  if (b.hits > MAX_ATTEMPTS) {
    return {
      ok: false,
      retryInMinutes: Math.max(1, Math.ceil((WINDOW_MS - (now - b.first)) / 60000)),
    };
  }
  return { ok: true };
}

/** Clears the count for this client after a correct password. */
export async function clearLoginAttempts() {
  buckets.delete(await clientKey());
}

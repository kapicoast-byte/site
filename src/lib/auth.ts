import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth as firebaseAuth } from "./firebase";

/**
 * Single-admin auth, backed by Firebase Authentication.
 *
 * There is still exactly one admin account and no signup route — that has not
 * changed. What changed is who holds the password: Firebase Auth does, not an
 * env var. This app never sees or stores the password itself.
 *
 * Login is two calls:
 *   1. A password check against Identity Toolkit's REST API. The Admin SDK
 *      cannot verify a password — by design, only the client SDKs and this
 *      REST endpoint can — so this app calls it directly, server-to-server.
 *      The key in the URL is a Firebase *Web* API key: a project identifier,
 *      not a secret, safe even if it were public. It stays out of the browser
 *      here anyway, same as everything else Firebase-related.
 *   2. On success, the Admin SDK turns the resulting ID token into a *session
 *      cookie* — a Firebase-signed, long-lived credential meant for exactly
 *      this kind of server-rendered app, verified without a network call on
 *      every normal request and revocable on demand (used on logout).
 *
 * Set up the one admin account with: node scripts/set-admin-user.mjs
 */

const COOKIE = "kapi_session";
const MAX_AGE_MS = 1000 * 60 * 60 * 8; // 8 hours — Firebase allows up to 14 days

const IDENTITY_TOOLKIT_URL =
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";

/**
 * Whether to mark the session cookie `Secure`.
 *
 * Keyed on the real request protocol, not NODE_ENV. Behind Dokploy/Traefik,
 * `x-forwarded-proto` says https and the cookie is locked to TLS. Served
 * directly over plain http — which Dokploy does until you attach a domain —
 * a Secure cookie would never come back and login would silently fail.
 */
async function useSecureCookie() {
  const h = await headers();
  const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim();
  if (proto) return proto === "https";
  const host = h.get("host") ?? "";
  return !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
}

/**
 * Checks a password against Firebase Auth and returns an ID token, or null.
 *
 * Also enforces the ADMIN_EMAIL allowlist: Identity Toolkit only confirms
 * *a* password matched *some* account in this Firebase project, not that the
 * account is the one meant to administer this site. Checked here rather than
 * trusted implicitly, so a second account added to the project later — by
 * accident or otherwise — cannot sign in here without also being allowlisted.
 */
async function verifyPassword(email: string, password: string): Promise<string | null> {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!apiKey || !adminEmail) return null;

  // Deliberately not short-circuited when the email is already a mismatch:
  // returning early would make "wrong email" answer faster than "wrong
  // password", a timing leak. The Identity Toolkit round trip runs either way
  // and the allowlist is checked below against its response.
  let res: Response;
  try {
    res = await fetch(`${IDENTITY_TOOLKIT_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
  } catch {
    return null; // network/DNS failure — treat like any other login failure
  }

  if (!res.ok) return null; // wrong password, unknown account, disabled, etc.

  const data = (await res.json()) as { idToken?: string; email?: string };
  if (!data.idToken) return null;

  if (data.email?.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
    return null; // the allowlist check this function exists to make
  }

  return data.idToken;
}

/**
 * Full login: verify the password, then mint a session cookie from the result.
 * Returns whether it succeeded; the caller redirects on success.
 */
export async function attemptLogin(email: string, password: string): Promise<boolean> {
  const idToken = await verifyPassword(email, password);
  if (!idToken) return false;

  const sessionCookie = await firebaseAuth().createSessionCookie(idToken, {
    expiresIn: MAX_AGE_MS,
  });

  (await cookies()).set(COOKIE, sessionCookie, {
    httpOnly: true,
    secure: await useSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_MS / 1000,
  });
  return true;
}

export async function destroySession() {
  const jar = await cookies();
  const cookie = jar.get(COOKIE)?.value;
  jar.delete(COOKIE);

  if (!cookie) return;
  // Revoke rather than merely forget: a session cookie is a bearer token
  // good until it expires, so clearing our own copy does not stop it working
  // if it leaked. verifySessionCookie(..., true) checks this on every call.
  try {
    const decoded = await firebaseAuth().verifySessionCookie(cookie);
    await firebaseAuth().revokeRefreshTokens(decoded.uid);
  } catch {
    // Already invalid or expired — nothing to revoke.
  }
}

/** Returns the signed-in admin, or null. Never throws. */
export async function getSession(): Promise<{ email: string } | null> {
  const cookie = (await cookies()).get(COOKIE)?.value;
  if (!cookie) return null;
  try {
    // `checkRevoked: true` costs a round trip to Firebase but means logout
    // (or revoking access from the Firebase console) takes effect immediately
    // instead of waiting out the cookie's remaining lifetime.
    const decoded = await firebaseAuth().verifySessionCookie(cookie, true);
    return { email: decoded.email ?? "" };
  } catch {
    return null; // expired, tampered, or revoked
  }
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

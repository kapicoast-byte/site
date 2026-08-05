import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "node:crypto";

/**
 * Single-admin auth.
 *
 * The credentials live in environment variables — there is no users table and
 * no signup route, so there is nothing to enumerate or brute-force at scale.
 * The session is a signed JWT in an httpOnly cookie.
 */

const COOKIE = "kapi_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or shorter than 32 characters. Generate one with: openssl rand -base64 32"
    );
  }
  return new TextEncoder().encode(s);
}

/** Length-independent comparison, so a wrong password can't be timed. */
function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab); // burn the same work before failing
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/**
 * Checks a login against ADMIN_EMAIL / ADMIN_PASSWORD.
 * ADMIN_PASSWORD may be a bcrypt hash (recommended) or plain text.
 * Both branches always run so the result isn't leaked by response time.
 */
export async function verifyCredentials(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return false;

  const emailOk = safeEqual(
    email.trim().toLowerCase(),
    adminEmail.trim().toLowerCase()
  );

  const passwordOk = /^\$2[aby]\$/.test(adminPassword)
    ? await bcrypt.compare(password, adminPassword)
    : safeEqual(password, adminPassword);

  return emailOk && passwordOk;
}

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

export async function createSession(email: string) {
  const token = await new SignJWT({ email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: await useSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Returns the signed-in admin, or null. Never throws. */
export async function getSession(): Promise<{ email: string } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "admin") return null;
    return { email: String(payload.email ?? "") };
  } catch {
    return null; // expired or tampered
  }
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

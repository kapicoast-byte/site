import "server-only";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firebase, server-side only.
 *
 * The browser SDK is deliberately not used anywhere in this project. Its config
 * — apiKey, authDomain, projectId — is public by design and ships inside the
 * JavaScript bundle, where anyone can read it from DevTools. That is not a leak
 * in Firebase's model, but it does mean Firestore/Storage rules become the only
 * thing standing between the public and the data.
 *
 * Using the Admin SDK here instead means:
 *   - nothing Firebase-related reaches the browser at all,
 *   - the storage bucket can stay completely private,
 *   - files are served through /api/uploads, so no Google URLs appear in the
 *     HTML either,
 *   - signing in is a server-to-server call this app makes on the visitor's
 *     behalf (see lib/auth.ts), not code running in their browser.
 *
 * The credential is a real secret, unlike the browser config. It bypasses every
 * security rule and works from anywhere on earth, so it lives only in the
 * Dokploy environment and never in the repository.
 *
 * `server-only` at the top makes importing this from a client component a build
 * error rather than a silent leak.
 *
 * Auth has no fallback the way storage does. Login is now entirely Firebase's —
 * there is no local password check left to fall back to — so a missing
 * credential here means nobody can sign in, not a silently degraded mode.
 */

/**
 * The service account JSON, base64-encoded.
 *
 * Base64 rather than raw JSON because the private key contains newlines, and
 * every environment-variable UI mangles those differently. Encode it with:
 *
 *   base64 -w0 service-account.json          (Linux)
 *   [Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))   (PowerShell)
 */
const SERVICE_ACCOUNT_B64 = process.env.FIREBASE_SERVICE_ACCOUNT;
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET;

/**
 * True when Storage is configured. Uploads fall back to local disk if not —
 * that fallback still makes sense, since a photo can live on a volume.
 *
 * There is no equivalent constant for auth. Signing in has nowhere left to
 * fall back to, so a missing credential surfaces as a clear startup error
 * instead of a silently different login path.
 */
export const firebaseEnabled = Boolean(SERVICE_ACCOUNT_B64 && BUCKET);

let app: App | null = null;

function getApp(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length) {
    app = existing[0];
    return app;
  }

  if (!SERVICE_ACCOUNT_B64) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not set. Sign-in and any Firebase-backed feature need it."
    );
  }

  let parsed: { project_id: string; client_email: string; private_key: string };
  try {
    parsed = JSON.parse(Buffer.from(SERVICE_ACCOUNT_B64, "base64").toString("utf8"));
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not valid base64-encoded JSON. Re-encode the service account file."
    );
  }

  app = initializeApp({
    credential: cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    }),
    // Only passed when set: initializeApp is happy with no bucket at all, and
    // an auth-only deployment (Storage still on disk) should not need one.
    ...(BUCKET ? { storageBucket: BUCKET } : {}),
  });
  return app;
}

export function bucket() {
  return getStorage(getApp()).bucket();
}

export function auth() {
  return getAuth(getApp());
}

/**
 * Marks a Firestore instance as already configured.
 *
 * This deliberately hangs off the instance rather than sitting in a module
 * variable. `settings()` may be called exactly once per instance, and the
 * instance outlives this module: `getApp()` above adopts an existing app via
 * `getApps()`, so a second copy of this module — a Fast Refresh in dev, a
 * separate server bundle in production — gets back the *same* already-
 * configured Firestore while its own module state starts empty. A module-level
 * boolean therefore says "not configured" about an object that is, and
 * `settings()` throws "Firestore has already been initialized", taking down
 * every page that reads content.
 *
 * Keeping the mark on the instance makes the flag and the thing it describes
 * impossible to separate. `Symbol.for` uses the cross-realm registry, so both
 * copies of the module look up the same key.
 */
const CONFIGURED = Symbol.for("kapicoast.firestore.settings-applied");

export function firestore() {
  const instance = getFirestore(getApp());
  const marked = instance as unknown as Record<symbol, true | undefined>;

  if (!marked[CONFIGURED]) {
    try {
      // Prisma returned `null` for unset optional columns; Firestore omits
      // absent fields entirely unless told otherwise. Writing undefined as
      // "leave this field alone" keeps partial updates behaving the way the
      // app expects.
      instance.settings({
        ignoreUndefinedProperties: true,
        // REST instead of gRPC. Every page here does a handful of one-shot
        // reads and then the request ends — there is no listener and nothing
        // long-lived for a gRPC channel to amortise, so REST starts faster and
        // has less to tear down. It also goes through Node's own TLS stack,
        // which means NODE_EXTRA_CA_CERTS works; gRPC keeps a separate root
        // store and fails with "unable to verify the first certificate" on any
        // machine behind a TLS-inspecting antivirus or corporate proxy.
        preferRest: true,
      });
    } catch (e) {
      // Someone already applied them — an older copy of this module, or one
      // that predates the mark. The setting we want is in force either way;
      // only *re-applying* it is an error. Rethrow anything else, because a
      // genuine failure here would silently change how writes behave.
      if (!/already been initialized/i.test(String((e as Error).message))) throw e;
    }
    // Outside the try on purpose. Marking only on success would leave an
    // already-configured instance throwing on every request forever, which is
    // exactly the failure this replaces.
    marked[CONFIGURED] = true;
  }
  return instance;
}

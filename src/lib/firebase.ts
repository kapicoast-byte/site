import "server-only";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

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
 *     HTML either.
 *
 * The credential is a real secret, unlike the browser config. It bypasses every
 * security rule and works from anywhere on earth, so it lives only in the
 * Dokploy environment and never in the repository.
 *
 * `server-only` at the top makes importing this from a client component a build
 * error rather than a silent leak.
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

/** True when Firebase is configured. Everything falls back to local disk if not. */
export const firebaseEnabled = Boolean(SERVICE_ACCOUNT_B64 && BUCKET);

let app: App | null = null;

function getApp(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length) {
    app = existing[0];
    return app;
  }

  if (!SERVICE_ACCOUNT_B64 || !BUCKET) {
    throw new Error(
      "Firebase is not configured. Set FIREBASE_SERVICE_ACCOUNT and FIREBASE_STORAGE_BUCKET."
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
    storageBucket: BUCKET,
  });
  return app;
}

export function bucket() {
  return getStorage(getApp()).bucket();
}

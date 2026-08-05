#!/usr/bin/env node
/**
 * Creates or updates the one Firebase Auth account this site's admin panel
 * accepts.
 *
 * Replaces the old bcrypt-hash-and-paste-into-an-env-var flow entirely. There
 * is no password anywhere in this app's own configuration now — it lives only
 * in Firebase, and this script's job is to set it there directly. The
 * password you type goes straight to Google over TLS via the Admin SDK; it is
 * never written to a file, logged, or held anywhere this script's process
 * doesn't need it for.
 *
 * Needs FIREBASE_SERVICE_ACCOUNT and ADMIN_EMAIL already set — in `.env` for
 * local use, or export them in your shell first when running this against a
 * production project from a machine that isn't Dokploy.
 *
 *   node scripts/set-admin-user.mjs
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { existsSync, readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// This script runs standalone, outside Next — load .env by hand so local use
// needs no extra setup beyond what the app itself already reads.
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
const adminEmail = process.env.ADMIN_EMAIL;

if (!b64) {
  console.error("FIREBASE_SERVICE_ACCOUNT is not set. See .env.example.");
  process.exit(1);
}
if (!adminEmail) {
  console.error("ADMIN_EMAIL is not set. See .env.example.");
  process.exit(1);
}

const parsed = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
initializeApp({
  credential: cert({
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  }),
});
const auth = getAuth();

const rl = createInterface({ input: stdin, output: stdout });
console.log(`Setting the password for ${adminEmail} (Firebase project ${parsed.project_id}).\n`);
const pw = await rl.question("New admin password: ");
rl.close();

if (pw.length < 12) {
  console.error("\nToo short. Use at least 12 characters — this is the only account.");
  process.exit(1);
}

try {
  const existing = await auth.getUserByEmail(adminEmail).catch(() => null);
  if (existing) {
    await auth.updateUser(existing.uid, { password: pw });
    console.log(`\nPassword updated for ${adminEmail}.`);
  } else {
    await auth.createUser({ email: adminEmail, password: pw, emailVerified: true });
    console.log(`\nAccount created for ${adminEmail}.`);
  }
  console.log("Keep the password in a password manager — there is no reset link.");
} catch (e) {
  console.error("\nFailed:", e.message);
  process.exit(1);
}

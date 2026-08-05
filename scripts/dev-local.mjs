#!/usr/bin/env node
/**
 * Local-only launcher for `next dev`.
 *
 * Node reads NODE_EXTRA_CA_CERTS exactly once, at process bootstrap — before
 * any application code runs, which includes Next's own `.env` loading. So
 * setting it in `.env` has no effect; by the time dotenv parses the file,
 * Node has already decided which certificate authorities it trusts.
 *
 * This machine has Avast's HTTPS scanning enabled, which re-signs every TLS
 * connection with its own root certificate. Without trusting that root, any
 * outbound HTTPS call from Node — including the ones this app makes to
 * Firebase Storage — fails with "unable to verify the first certificate".
 *
 * The fix is to set the variable in the OS environment before the `next dev`
 * process is spawned, which is exactly what happens below: this script's own
 * env is set first, then `next dev` is spawned as a child that inherits it at
 * birth, satisfying the "before process start" requirement.
 *
 * Not needed anywhere else. Dokploy runs a plain Linux container with no
 * antivirus doing TLS interception, so `npm run build` / `node server.js`
 * need none of this — see package.json.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const AVAST_CA = "C:\\ProgramData\\Avast Software\\Avast\\wscert.pem";

if (!process.env.NODE_EXTRA_CA_CERTS && existsSync(AVAST_CA)) {
  process.env.NODE_EXTRA_CA_CERTS = AVAST_CA;
  console.log("[dev-local] Avast TLS scanning detected — trusting its root CA for this dev server.");
}

// On Windows, npx resolves to a .cmd shim, and a .cmd file can only be run
// through cmd.exe — shell: true is required, not optional, here. Node's
// deprecation warning about that combination is about an ARRAY of args being
// concatenated unescaped; passing one fixed literal string instead carries no
// such risk (there is no user input in this command at all) while still
// avoiding the warning.
const child = spawn("npx next dev", {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));

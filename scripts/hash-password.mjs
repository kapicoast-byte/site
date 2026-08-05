/**
 * Turns a password into a bcrypt hash for ADMIN_PASSWORD.
 *
 * Run it, type the password, paste the hash into Dokploy. The plain password
 * never touches a file, a shell history, or this repository — auth.ts accepts
 * either a hash or plain text, and a hash means a leaked env var does not hand
 * over the account.
 *
 *   node scripts/hash-password.mjs
 */
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const rl = createInterface({ input: stdin, output: stdout });
const pw = await rl.question("New admin password: ");
rl.close();

if (pw.length < 12) {
  console.error("\nToo short. Use at least 12 characters — this is the only account.");
  process.exit(1);
}
console.log("\nADMIN_PASSWORD=" + (await bcrypt.hash(pw, 12)));
console.log("\nPaste that whole line into Dokploy. Keep the password itself in a password manager.");

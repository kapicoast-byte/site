/**
 * Starts a throwaway PostgreSQL on port 5433 for local testing.
 * Uses a portable binary from node_modules — nothing is installed system-wide.
 *
 *   node scripts/test-db.mjs start
 *   node scripts/test-db.mjs stop
 */
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const pg = new EmbeddedPostgres({
  databaseDir: path.join(root, ".pgdata"),
  user: "kapi",
  password: "kapi",
  port: 5433,
  persistent: true,
});

const cmd = process.argv[2] ?? "start";

if (cmd === "start") {
  try {
    await pg.initialise();
  } catch {
    /* already initialised */
  }
  await pg.start();
  try {
    await pg.createDatabase("kapicoast");
  } catch {
    /* already exists */
  }
  console.log("postgres up on 5433");
  // Stay alive — the server is a child process and dies with this one.
  process.on("SIGINT", async () => {
    await pg.stop();
    process.exit(0);
  });
  setInterval(() => {}, 1 << 30);
} else {
  await pg.stop();
  console.log("postgres stopped");
  process.exit(0);
}

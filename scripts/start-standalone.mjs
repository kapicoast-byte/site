/**
 * Runs the production build the same way the Docker image does.
 *
 * `next start` does NOT work with `output: "standalone"` — it starts, serves
 * pages, but server actions misbehave. The standalone bundle needs `public/`
 * and `.next/static/` copied next to it first; the Dockerfile does that, and
 * so does this script.
 */
import { cp, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(root, ".next", "standalone");

await mkdir(path.join(standalone, ".next"), { recursive: true });
await cp(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
await cp(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), {
  recursive: true,
});

console.log("Serving the production build on http://localhost:" + (process.env.PORT ?? 3000));

spawn(process.execPath, ["server.js"], {
  cwd: standalone,
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: process.env.PORT ?? "3000",
    HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
    // Uploads live outside the build output so they survive rebuilds.
    UPLOAD_DIR: process.env.UPLOAD_DIR ?? path.join(root, "uploads"),
  },
});

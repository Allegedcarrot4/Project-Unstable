// Builds the frontend for CDN hosting (jsDelivr, gcore mirror, statically.io …).
//
//   node scripts/build-cdn.mjs
//   CDN_BASE=https://cdn.jsdelivr.net/gh/<owner>/<repo>@main/cdn/ node scripts/build-cdn.mjs
//
// Vite's `base` is set to the absolute CDN URL, so every asset URL in the
// built HTML/JS is absolute and keeps working no matter which document the
// page is rendered from (including inside cdn-gateway.svg). Output lands in
// ./cdn, which is what the gateway fetches at runtime.
//
// The obfuscator/compression sidecars (.br/.gz) are dropped afterwards:
// file CDNs compress responses themselves and the sidecars would only
// double the repository size.
import { spawnSync } from "node:child_process";
import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(repoRoot, "cdn");

const CDN_BASE = (
  process.env.CDN_BASE || "https://cdn.jsdelivr.net/gh/Allegedcarrot4/Project-Unstable@main/cdn/"
).replace(/\/*$/, "/");

const viteBin = path.join(repoRoot, "node_modules", "vite", "bin", "vite.js");

console.log(`Building frontend for CDN at ${CDN_BASE} -> ${path.relative(repoRoot, outDir)}/`);

const result = spawnSync(
  process.execPath,
  [
    viteBin,
    "build",
    "--config",
    path.join(repoRoot, "artifacts", "app", "vite.config.ts"),
    "--outDir",
    outDir,
    "--emptyOutDir",
  ],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, BASE_PATH: CDN_BASE, NODE_ENV: "production" },
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const files = await readdir(outDir, { recursive: true });
let removed = 0;
for (const file of files) {
  if (/\.(?:br|gz)$/.test(file)) {
    await unlink(path.join(outDir, file));
    removed += 1;
  }
}

console.log(`CDN build ready: ${path.relative(repoRoot, outDir)} (dropped ${removed} compression sidecars)`);
console.log(`Gateway should point PAGE at: ${CDN_BASE}index.html`);

#!/usr/bin/env node
// Builds dist/ — a deploy-ready static site.
//
// Layout:
//   dist/
//     index.html         (the builder)
//     manifest.json      (machine-readable catalog)
//     install.sh         (curl-pipeable installer)
//     skills/<id>/SKILL.md
//     agents/<id>.md
//     commands/<id>.md
//
// Upload dist/ to your static host (Plesk subdomein docroot, S3, Cloudflare
// Pages output dir, etc). The install.sh fetches files relatively from the
// same host the page is served from, so deploy is one rsync.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dist = path.join(root, "dist");

// Clean
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

// Top-level files
const topFiles = [
  ["web/index.html", "index.html"],
  ["manifest.json",  "manifest.json"],
  ["install.sh",     "install.sh"],
];

for (const [src, dst] of topFiles) {
  const srcPath = path.join(root, src);
  if (!fs.existsSync(srcPath)) {
    console.error(`!! missing source: ${src} (run \`npm run build\` first if it's manifest.json)`);
    process.exit(1);
  }
  fs.cpSync(srcPath, path.join(dist, dst));
}
fs.chmodSync(path.join(dist, "install.sh"), 0o755);

// Catalog content + assets (banner etc.) for the deployed mirror
let copied = 0;
for (const dir of ["skills", "agents", "commands", "assets"]) {
  const src = path.join(root, dir);
  if (!fs.existsSync(src)) continue;
  fs.cpSync(src, path.join(dist, dir), { recursive: true });
  // Count files for reporting
  const entries = fs.readdirSync(path.join(dist, dir), { recursive: true, withFileTypes: true });
  copied += entries.filter(e => e.isFile()).length;
}

// Size summary
function dirSize(p) {
  let total = 0;
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const full = path.join(p, e.name);
    if (e.isDirectory()) total += dirSize(full);
    else total += fs.statSync(full).size;
  }
  return total;
}
const bytes = dirSize(dist);
const kb = (bytes / 1024).toFixed(1);

console.log(`Packaged dist/ — ${copied} catalog file(s), ${kb} KB total.`);
console.log(`\nUpload everything under dist/ to your static host's docroot.`);
console.log(`Example (rsync):`);
console.log(`  rsync -av --delete dist/ user@host:/var/www/security.example.com/`);

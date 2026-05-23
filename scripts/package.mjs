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

// web/index.html — copy and inject CollectionPage + ItemList JSON-LD from catalog.json
// The placeholder marker in web/index.html (<!-- SCHEMA:CATALOG_ITEMLIST -->) is
// replaced with a <script type="application/ld+json"> block listing every catalog item.
// Keeps schema in sync with the catalog without committing generated content to source.
{
  const SITE = "https://accans.com/skills/";
  const html = fs.readFileSync(path.join(root, "web/index.html"), "utf8");
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "catalog.json"), "utf8"));
  const items = Array.isArray(catalog.items) ? catalog.items : [];

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": SITE + "#collection",
    "name": "Claude Code Security Skills Catalog",
    "description": catalog?.meta?.description ?? "Security-focused skills, agents and commands for Claude Code.",
    "url": SITE,
    "inLanguage": "en",
    "isPartOf": { "@type": "WebSite", "url": "https://accans.com", "name": "Accans" },
    "about": [
      { "@type": "Thing", "name": "Application Security" },
      { "@type": "Thing", "name": "Penetration Testing" },
      { "@type": "Thing", "name": "Blue Team Security" },
      { "@type": "Thing", "name": "Governance Risk Compliance" },
      { "@type": "Thing", "name": "Claude Code" }
    ],
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": items.length,
      "itemListElement": items.map((it, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": it.name ?? it.id,
        "url": `${SITE}#${it.id}`,
        "description": it.desc ?? ""
      }))
    }
  };

  const block = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  const patched = html.replace("<!-- SCHEMA:CATALOG_ITEMLIST -->", block);

  if (patched === html) {
    console.warn("!! SCHEMA:CATALOG_ITEMLIST placeholder not found in web/index.html — schema not injected");
  }
  fs.writeFileSync(path.join(dist, "index.html"), patched);
}

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

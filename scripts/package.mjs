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

// web/index.html — copy and inject Schema.org @graph from catalog.json.
// The placeholder marker in web/index.html (<!-- SCHEMA:CATALOG_ITEMLIST -->) is
// replaced with a <script type="application/ld+json"> block containing a richer
// entity graph: the publishing Organization (Accans), the author Person (Ric, by
// @id reference to the homepage entity), the SoftwareSourceCode for the catalog
// repo, and the CollectionPage + ItemList of every catalog item. Cross-referenced
// via @id so Google can resolve "Accans" / "Ric" / "the catalog" as a single
// entity graph instead of an isolated page listing.
{
  const SITE = "https://accans.com/skills/";
  const SITE_ROOT = "https://accans.com";
  const REPO = "https://github.com/roodlicht/accans-sec-skills";

  const html = fs.readFileSync(path.join(root, "web/index.html"), "utf8");
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "catalog.json"), "utf8"));
  const items = Array.isArray(catalog.items) ? catalog.items : [];

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      // Person — already canonically defined on accans.com homepage as #ric.
      // Re-listing the @id here signals to Google "this is the same entity";
      // declared minimally so the cross-page graph resolves without duplicating
      // the full Person record.
      {
        "@type": "Person",
        "@id": SITE_ROOT + "/#ric",
        "name": "Ric van Westhreenen",
        "url": SITE_ROOT
      },

      // Organization — same @id pattern as the homepage ProfessionalService block.
      {
        "@type": "Organization",
        "@id": SITE_ROOT + "/#org",
        "name": "Accans",
        "url": SITE_ROOT,
        "logo": SITE_ROOT + "/apple-touch-icon.png",
        "founder": { "@id": SITE_ROOT + "/#ric" },
        "sameAs": [
          "https://www.linkedin.com/in/westhreenen/",
          "https://github.com/roodlicht"
        ]
      },

      // SoftwareSourceCode — the catalog itself as a tangible code asset on GitHub.
      // Helps Google connect this page to the open-source project (and vice versa
      // when GitHub gets crawled).
      {
        "@type": "SoftwareSourceCode",
        "@id": SITE + "#catalog",
        "name": catalog?.meta?.name ?? "Accans Sec Skills",
        "description": catalog?.meta?.description ?? "Security-focused skills, agents and commands for Claude Code.",
        "url": SITE,
        "codeRepository": REPO,
        "programmingLanguage": "Markdown",
        "license": REPO + "/blob/main/LICENSING.md",
        "version": catalog?.meta?.version,
        "author": { "@id": SITE_ROOT + "/#ric" },
        "maintainer": { "@id": SITE_ROOT + "/#org" }
      },

      // CollectionPage — the page itself, linked to publisher + author + the
      // SoftwareSourceCode it presents. mainEntity carries the ItemList.
      {
        "@type": "CollectionPage",
        "@id": SITE + "#collection",
        "name": "Claude Code Security Skills Catalog",
        "description": catalog?.meta?.description ?? "Security-focused skills, agents and commands for Claude Code.",
        "url": SITE,
        "inLanguage": "en",
        "isPartOf": { "@type": "WebSite", "url": SITE_ROOT, "name": "Accans" },
        "publisher": { "@id": SITE_ROOT + "/#org" },
        "author": { "@id": SITE_ROOT + "/#ric" },
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
      }
    ]
  };

  const block = `<script type="application/ld+json">${JSON.stringify(graph)}</script>`;
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

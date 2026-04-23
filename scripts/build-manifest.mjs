#!/usr/bin/env node
// Scans skills/, agents/, commands/ directories, parses frontmatter,
// and emits:
//   - manifest.json  (machine-readable catalog — used by the CLI and other tools)
//   - web/index.html (the builder, with CATALOG injected from the live files)
//
// The source of truth is the on-disk content. catalog.json is only used to
// preserve the category/profile mapping — edit it if you add a new skill.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const catalog = JSON.parse(fs.readFileSync(path.join(root, "catalog.json"), "utf8"));
const byId = Object.fromEntries(catalog.items.map(it => [it.id, it]));

// --- frontmatter parse (yaml-ish, good enough for simple key: value lines) ---
function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function scanDir(dir, type) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return [];
  const results = [];
  const entries = fs.readdirSync(full, { withFileTypes: true });
  for (const e of entries) {
    if (type === "skill" && e.isDirectory()) {
      const f = path.join(full, e.name, "SKILL.md");
      if (fs.existsSync(f)) {
        const fm = parseFrontmatter(fs.readFileSync(f, "utf8"));
        results.push({ id: e.name, type, path: path.relative(root, path.dirname(f)), fm });
      }
    } else if (e.isFile() && e.name.endsWith(".md")) {
      const f = path.join(full, e.name);
      const id = e.name.replace(/\.md$/, "");
      const fm = parseFrontmatter(fs.readFileSync(f, "utf8"));
      results.push({ id, type, path: path.relative(root, f), fm });
    }
  }
  return results;
}

const found = [
  ...scanDir("skills",   "skill"),
  ...scanDir("agents",   "agent"),
  ...scanDir("commands", "command"),
];

// Merge with catalog metadata (category, profiles) and warn on mismatches.
const manifestItems = [];
const seen = new Set();
for (const f of found) {
  const meta = byId[f.id];
  if (!meta) {
    console.warn(`!! ${f.type} "${f.id}" found on disk but not in catalog.json — skipping.`);
    continue;
  }
  seen.add(f.id);
  manifestItems.push({
    id: f.id,
    name: meta.name,
    type: f.type,
    cat: meta.cat,
    profiles: meta.profiles,
    desc: f.fm.description || meta.desc,
    path: f.path
  });
}
for (const it of catalog.items) {
  if (!seen.has(it.id)) {
    console.warn(`!! catalog item "${it.id}" has no file on disk — run scripts/scaffold.mjs first.`);
  }
}

// Sort deterministically by type then id
const typeOrder = { skill: 0, agent: 1, command: 2 };
manifestItems.sort((a, b) => (typeOrder[a.type] - typeOrder[b.type]) || a.id.localeCompare(b.id));

const manifest = {
  meta: catalog.meta,
  profiles: catalog.profiles,
  items: manifestItems
};

// Write manifest.json
fs.writeFileSync(
  path.join(root, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);
console.log(`Wrote manifest.json with ${manifestItems.length} items.`);

// Inject CATALOG and PROFILES into web/index.html
const htmlPath = path.join(root, "web", "index.html");
if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, "utf8");
  const catalogJson = JSON.stringify(manifestItems, null, 2);
  const profilesJson = JSON.stringify(manifest.profiles, null, 2);
  html = html.replace(
    /\/\* MANIFEST:BEGIN \*\/[\s\S]*?\/\* MANIFEST:END \*\//,
    `/* MANIFEST:BEGIN */\nconst CATALOG = ${catalogJson};\nconst PROFILE_META = ${profilesJson};\n/* MANIFEST:END */`
  );
  fs.writeFileSync(htmlPath, html);
  console.log(`Injected manifest into web/index.html.`);
} else {
  console.warn("web/index.html not found — skipping HTML injection.");
}

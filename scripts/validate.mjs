#!/usr/bin/env node
// Validates catalog.json against on-disk content:
//   1. Every catalog entry has a corresponding file.
//   2. Every file has parsable frontmatter with the right name/description.
//   3. No file still carries the "_Status: stub_" marker.
//   4. No orphan files (on disk but not in catalog).
//   5. Cross-reference graph: which skills mention which other skills.
//
// Exits non-zero on errors. Prints warnings non-fatally.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "catalog.json"), "utf8"));

const DIRS = { skill: "skills", agent: "agents", command: "commands" };

function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function targetPath(item) {
  const dir = DIRS[item.type];
  if (!dir) throw new Error(`Unknown type: ${item.type}`);
  if (item.type === "skill") return path.join(root, dir, item.id, "SKILL.md");
  return path.join(root, dir, `${item.id}.md`);
}

function scanDir(dir, type) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return [];
  const out = [];
  for (const e of fs.readdirSync(full, { withFileTypes: true })) {
    if (type === "skill" && e.isDirectory()) out.push(e.name);
    else if (type !== "skill" && e.isFile() && e.name.endsWith(".md")) out.push(e.name.replace(/\.md$/, ""));
  }
  return out;
}

const errors = [];
const warnings = [];
const idSet = new Set(catalog.items.map(i => i.id));

// 1-3: catalog entries against disk
for (const item of catalog.items) {
  const p = targetPath(item);
  if (!fs.existsSync(p)) {
    errors.push(`MISSING: ${item.type} "${item.id}" not found at ${path.relative(root, p)}`);
    continue;
  }
  const src = fs.readFileSync(p, "utf8");
  const fm = parseFrontmatter(src);
  if (!fm) {
    errors.push(`NO_FRONTMATTER: ${item.id} at ${path.relative(root, p)}`);
    continue;
  }
  if (item.type !== "command" && fm.name !== item.id) {
    errors.push(`NAME_MISMATCH: ${item.id} has frontmatter name="${fm.name ?? ""}"`);
  }
  if (!fm.description) {
    errors.push(`NO_DESCRIPTION: ${item.id} has no description in frontmatter`);
  } else if (fm.description.length < 30) {
    warnings.push(`DESC_SHORT: ${item.id} description is ${fm.description.length} chars (matcher works better with more)`);
  }
  if (src.includes("_Status: stub")) {
    errors.push(`STUB_MARKER: ${item.id} still has stub-marker`);
  }
}

// 4: orphan files (on disk, not in catalog)
for (const [type, dir] of Object.entries(DIRS)) {
  for (const id of scanDir(dir, type)) {
    if (!idSet.has(id)) {
      warnings.push(`ORPHAN: ${dir}/${id} on disk but not in catalog.json`);
    }
  }
}

// 5: reference graph
const refs = new Map();
for (const item of catalog.items) {
  const p = targetPath(item);
  if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, "utf8");
  const refIds = new Set();
  for (const m of src.matchAll(/`([a-z][a-z0-9-]+[a-z0-9])`/g)) {
    if (idSet.has(m[1]) && m[1] !== item.id) refIds.add(m[1]);
  }
  refs.set(item.id, refIds);
}

// Output
console.log(`Validated ${catalog.items.length} items.`);
console.log(`  errors:   ${errors.length}`);
console.log(`  warnings: ${warnings.length}`);

if (errors.length) {
  console.error("\nERRORS:");
  for (const e of errors) console.error("  " + e);
}
if (warnings.length) {
  console.warn("\nWARNINGS:");
  for (const w of warnings) console.warn("  " + w);
}

// Reference graph summary (informational, never fails)
const totalRefs = [...refs.values()].reduce((a, s) => a + s.size, 0);
const incoming = new Map();
for (const [, toSet] of refs) {
  for (const to of toSet) incoming.set(to, (incoming.get(to) || 0) + 1);
}

console.log(`\nCross-reference graph:`);
console.log(`  ${totalRefs} skill-id mentions across ${refs.size} items.`);

const noOutbound = [...refs.entries()].filter(([, s]) => s.size === 0).map(([id]) => id);
if (noOutbound.length) {
  console.log(`  no-outbound (${noOutbound.length}): ${noOutbound.join(", ")}`);
}
const noIncoming = catalog.items.filter(i => !incoming.has(i.id)).map(i => i.id);
if (noIncoming.length) {
  console.log(`  no-incoming (${noIncoming.length}): ${noIncoming.join(", ")}`);
}

const top = [...incoming.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
if (top.length) {
  console.log(`  top inbound:`);
  for (const [id, n] of top) console.log(`    ${id}: ${n} mentions`);
}

process.exit(errors.length > 0 ? 1 : 0);

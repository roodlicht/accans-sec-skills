#!/usr/bin/env node
// Generates stub SKILL.md / agent / command files for every entry in catalog.json
// that doesn't already exist on disk. Idempotent — existing files are never overwritten.
//
// Usage:  node scripts/scaffold.mjs           # scaffold missing stubs
//         node scripts/scaffold.mjs --force   # overwrite existing stubs (DANGEROUS)

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "catalog.json"), "utf8"));

const force = process.argv.includes("--force");

const DIRS = { skill: "skills", agent: "agents", command: "commands" };

const SKILL_TEMPLATE = (item) => `---
name: ${item.id}
description: ${item.desc}
---

# ${item.name}

_Status: stub — inhoud nog uit te werken._

## Wanneer gebruiken

<!-- Beschrijf concreet welke vragen of situaties deze skill activeren.
     Trigger-woorden die Claude moet herkennen, typische context, welke bestanden
     of tools aanwezig zijn. -->

## Aanpak

<!-- De kern van de skill: wat doet Claude wanneer deze skill actief is?
     Stappen, checks, bronnen om te raadplegen. Bij voorkeur als genummerde
     fases zodat Claude het kan volgen. -->

## Output

<!-- Wat is het eindresultaat — een rapport, een PR-review, een checklist?
     Wat moet er in, wat hoort er niet in. -->

## Referenties

<!-- OWASP, NIST, vendor docs, artikelen die je als bron wilt koppelen. -->

## Categorieën

${item.cat.map(c => `- ${c}`).join("\n")}
`;

const AGENT_TEMPLATE = (item) => `---
name: ${item.id}
description: ${item.desc}
model: sonnet
tools: Read, Grep, Glob, Bash
---

# ${item.name}

_Status: stub — system prompt en scope nog uit te werken._

Je bent een ${item.name.toLowerCase()} — gespecialiseerd in: ${item.desc.toLowerCase()}

## Scope

<!-- Wat valt er binnen deze agent, wat niet. Welke tools mag de agent gebruiken,
     welke beslissingen moet hij zelf maken, welke escaleren naar de caller. -->

## Werkwijze

<!-- Concrete stappen, heuristieken, framework keuzes. -->

## Uitvoer

<!-- Welk formaat verwacht de caller terug? Rapport, patch, gestructureerde JSON? -->
`;

const COMMAND_TEMPLATE = (item) => `---
description: ${item.desc}
argument-hint: "[options]"
---

# /${item.id}

_Status: stub — commando-inhoud nog uit te werken._

## Wat doet dit commando

${item.desc}

## Stappen

<!-- Wat moet Claude exact uitvoeren als deze slash-command wordt aangeroepen? -->

## Argumenten

<!-- Documenteer flags/opties als van toepassing. -->
`;

function targetPath(item) {
  const dir = DIRS[item.type];
  if (!dir) throw new Error(`Unknown type: ${item.type}`);
  if (item.type === "skill") {
    return path.join(root, dir, item.id, "SKILL.md");
  }
  return path.join(root, dir, `${item.id}.md`);
}

function render(item) {
  if (item.type === "skill") return SKILL_TEMPLATE(item);
  if (item.type === "agent") return AGENT_TEMPLATE(item);
  if (item.type === "command") return COMMAND_TEMPLATE(item);
  throw new Error(`Unknown type: ${item.type}`);
}

let created = 0, skipped = 0;
for (const item of catalog.items) {
  const p = targetPath(item);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (fs.existsSync(p) && !force) { skipped++; continue; }
  fs.writeFileSync(p, render(item));
  created++;
}

console.log(`Scaffolded ${created} stubs, skipped ${skipped} (already existed).`);
if (skipped > 0 && !force) console.log("Pass --force to overwrite.");

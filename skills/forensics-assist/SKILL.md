---
name: forensics-assist
description: Digitale-forensisch assistant voor IR-context — memory-analyse via Volatility 3, disk-imaging-hygiene (write-blocker, hash-validation), timeline-reconstructie via plaso/log2timeline, file-system-artefacten per OS. Audit-grade evidence; rechtbank-grade chain-of-custody vraagt aanvullend gespecialiseerd-forensics-werk.
---

# Forensics Assist

> **Audit-grade vs. forensics-grade**: deze skill ondersteunt incident-response-grade onderzoek met evidence die later kan worden aangevuld voor rechtszaken, maar die zelf geen volledige chain-of-custody-certified-forensics-output is. Gespecialiseerde forensische teams (interne forensics-cell of externe partner zoals Fox-IT of Northwave) doen het rechtbank-grade-werk waar dat nodig is. Skill structureert hash-validatie, write-blocker-discipline en timeline-reconstructie zodat het werk bruikbaar is voor IR plus eventuele follow-up-forensics.

## Wanneer gebruiken

Een incident vraagt vaak forensisch-onderzoek parallel aan IR-actie. Deze skill levert de praktische lens voor de blue-team-kant: wat captured je, hoe analyseer je het, en wat lever je over aan IR of gespecialiseerd forensics.

Activeert bij:

- Een vraag als "memory-analyse op deze dump", "disk-image hygiene-check", "timeline-bouwen uit dit event-log + filesystem", "wat bekend uit MFT", "Volatility-plugin-keuze".
- Een handoff vanuit `ir-runbook` (forensics-stap binnen response), `malware-triage` (memory-extracted-binary), `log-triage` (host-investigation na anomaly).
- Een verdacht-host-snapshot waar je moet bepalen "wat is er gebeurd, hoe ver is het gegaan, hoe lang is het er".
- Periodieke training of post-incident-review waar een sample-investigatie wordt herhaald.

### Wanneer NIET (handoff)

- Rechtbank-grade-forensics → gespecialiseerd team. Deze skill is operationeel-grade.
- Reverse-engineering van een sample in detail → `malware-triage`.
- IR-coordinatie zelf → `ir-runbook`.
- Detection-rule-bouw uit findings → `detection-engineer`.
- IOC-extractie en sharing → `ioc-hunter`.
- Cloud-forensics specifiek (AWS-snapshots, Azure-disk-export, M365-eDiscovery): deels in scope (artefacten interpreteren), provider-specifieke workflows met cloud-team coordineren.
- E-Discovery voor litigation → legal-team plus gespecialiseerde tooling (Relativity, Nuix).

## Aanpak

Zes fases. Fase 1 (acquisition-discipline) is waar evidence-waarde wordt geborgen; fase 4 (timeline) is waar forensisch werk verhaal wordt.

### 1. Acquisition: hygiene en chain

Foundation. Een corrupted-acquisition-disk maakt latere analyse onbetrouwbaar.

- **Write-blocker** voor disk-acquisitie: hardware-blocker (Tableau, Wiebetech, CRU) of software-write-blocker als hardware niet beschikbaar. Doel: source-disk niet wijzigen.
- **Hash-validation**: voor en na imaging hash van source berekenen, voorbij FTK Imager / dd / Guymager. Als hashes matchen, image is bit-identiek aan source op het moment.
- **Image-formaten**: raw `.dd`, EnCase `.E01` (compressed + metadata), AFF4. Voor IR-context typisch `.dd` of `.E01`.
- **Memory-acquisition** vóór power-off waar mogelijk: WinPMEM (Windows), AVML (Linux), osxpmem (macOS). Memory bevat process-info, network-state, decrypted-data — vernietigd bij shutdown.
- **Live-response-data** als alternatief op full-image waar full niet kan: KAPE (Kroll Artifact Parser/Extractor) voor doelgerichte artefact-collectie, Velociraptor voor live-collection over endpoint-fleet.
- **Chain-of-custody-record**: wie verzamelde, wanneer, hoe verzonden, wie heeft toegang gehad. Voor audit-grade voldoende; voor evidentiary-grade vraagt aanvullende discipline (gehandtekend, getuige aanwezig, dual-control).

Output van fase 1: hash-bevestigde-image plus collectie-log. Pas dan analyse.

### 2. Memory-analyse via Volatility 3

Volatility 3 is de open-source-standaard.

```bash
# Profile auto-detect
vol -f mem.raw windows.info

# Process-listing en eventuele hidden-processes
vol -f mem.raw windows.pslist
vol -f mem.raw windows.psscan      # carved processes (kan hidden tonen)
vol -f mem.raw windows.pstree

# Network connections op het moment van capture
vol -f mem.raw windows.netscan

# Process-injection-detectie
vol -f mem.raw windows.malfind

# Loaded DLLs / suspect imports
vol -f mem.raw windows.dlllist --pid <PID>

# Command-line forensics
vol -f mem.raw windows.cmdline
```

Plugin-categorieën om standaard langs te gaan:

- **Process-state**: pslist, pstree, psscan (carved), psxview (cross-source), malfind (process-injection).
- **Network**: netscan, netstat (kernel-state).
- **DLL/handle**: dlllist, handles, modules.
- **Registry-from-memory**: windows.registry.printkey, hashdump.
- **Filesystem**: filescan, dumpfiles.
- **Userland**: cmdline, getsids, sessions.

Voor Linux: `linux.pslist`, `linux.netstat`, `linux.bash` (bash-history van memory), `linux.malfind`. Voor macOS: `mac.pslist`, `mac.netstat`, etc.

Memory-evidence is volatile — eens gedumpt, een snapshot. Documenteer capture-tijd zorgvuldig.

### 3. Disk-analyse en filesystem-artefacten

Per OS verschillen artefacten. Top-bronnen om standaard te raadplegen:

**Windows**:

- **MFT** (Master File Table) — record van alle file-creates/wijzigingen. `MFTECmd` (Eric Zimmerman tools) parses naar timeline-friendly output.
- **USN-Journal** — change-log van NTFS, sneller-vergankelijk.
- **Event-logs** (`%SystemRoot%\System32\winevt\Logs\*.evtx`): Security, System, Application, plus PowerShell-log, Sysmon-log, RDP-log.
- **Registry-hives**: SOFTWARE, SYSTEM, SAM, NTUSER.DAT, USRCLASS.DAT. RegRipper voor parsing.
- **Prefetch** (`%SystemRoot%\Prefetch\*.pf`): execution-history. PECmd voor parsing.
- **Shimcache / AmCache**: app-execution-evidence.
- **LNK-files** in Recent: file-access-history.
- **Browser-history**: per-browser SQLite-databases.
- **ShellBags** (registry): folder-navigatie-evidence.
- **SRUM** (System Resource Usage Monitor): per-process resource-usage met timestamps.

**Linux**:

- **bash_history** + zsh_history.
- **/var/log/auth.log**, syslog, journald (`journalctl`).
- **inotify-events** waar geconfigureerd.
- **systemd-journal** voor unit-execution.
- **cron-tab + at-jobs** voor persistence.
- **last/wtmp** voor login-history.

**macOS**:

- **unified-logs** (`log show --predicate ...`).
- **plist-files** voor LaunchAgents/LaunchDaemons.
- **FSEvents** voor filesystem-changes.
- **Quarantine-database** voor downloaded-files-tracking.

Tool-pakketten: KAPE-targets per OS, Eric Zimmerman tools (MFTECmd, RECmd, EvtxECmd, AmcacheParser, etc.), Plaso/log2timeline voor unified-timeline.

### 4. Timeline-reconstructie

Een tijdslijn maakt forensisch werk verhaal. plaso/log2timeline aggregeert artefacten naar één timeline.

```bash
# Plaso parses image to .plaso storage
log2timeline.py --storage-file mfx.plaso /evidence/disk.E01

# Timeline output als CSV
psort.py -o l2tcsv -w timeline.csv mfx.plaso

# Filteren op tijdsvenster en bron
psort.py -o dynamic -w timeline-filtered.csv mfx.plaso "date > '2026-04-20 09:00:00'"
```

Discipline:

- **Time-zone-discipline**: alle artefacten naar één tijdzone (UTC default in Plaso). Per-source-clocks kunnen drift hebben — documenteer.
- **Pivot-points**: bekend-suspect-event (een specifieke proces-execution, een log-anomalie) als anker. Werk N-minuten voor en na uit.
- **Multi-source**: filesystem + registry + event-logs + browser-data samen geven verhaal. Eén-source-timeline mist context.
- **Visualisatie**: Timesketch (open-source, by Google), of CSV in Excel/Tableau voor kleinere datasets.
- **Anti-forensics-aware**: timestomping (T1070.006), log-clearing (T1070.001) — als artefact-tijdslijn inconsistent is, mogelijk-bewust gemanipuleerd. Documenteer.

### 5. Reporting en handoff

Output past in `ir-runbook`-incident-log of als bijlage bij `pentest-reporter`-style finding. Structuur:

- **Acquisition-context**: bron, methode, hash-bevestiging, time-of-capture.
- **Belangrijkste vondsten** geprioriteerd op IR-impact: persistence, lateral-movement-evidence, data-exfil-evidence, malware-aanwezigheid.
- **Timeline** rond pivot-events.
- **Open vragen** voor gespecialiseerd-forensics als rechtbank-grade nodig is.
- **Recommendations** voor cleanup en re-image-of-restore-strategy.

### 6. Verification-loop

Laag 1: scope (alle expected-artefacten gecheckt voor het OS, niet één-source-tunnelvision?), aannames (capture-time-zone gedocumenteerd, hashes pre/post matchen?), gaps (anti-forensics-mogelijkheden meegenomen?). Laag 2: tool-namen tegen actuele versies (Volatility 2 vs 3, Plaso-syntax wijzigt), filesystem-artefact-namen kloppen (Windows-evolutie tussen 10/11; macOS-artefacten tussen Catalina/Ventura/Sonoma), geen verzonnen registry-paths.

## Output

```
Forensics findings — <host / case-ID>
Acquisition:
  Type:               <full-disk image / memory-only / live-response>
  Tool:               <Tableau / WinPMEM / KAPE / etc>
  Capture-time:       <UTC + local + TZ>
  Hash-pre/post:      <verified | mismatch>
  Storage:            <encrypted-vault path + chain-of-custody-ref>

Memory-analyse (indien dump):
  Profile:            <auto-detected version>
  Process-tree:       <samenvatting suspect branches>
  Network-state:      <connections at capture>
  Process-injection:  <malfind hits + PIDs>
  Hidden processes:   <psxview discrepancies>

Disk/filesystem (per platform):
  MFT/USN highlights:    <suspect file-creates/wijzigingen>
  Event-log highlights:  <Security/PowerShell/Sysmon-anomalies>
  Registry highlights:   <persistence keys, recent-doc traces>
  Execution-evidence:    <Prefetch / Shimcache / AmCache / SRUM>
  Browser-history:       <suspect URLs>

Timeline (rond pivot-events):
  T-30m → T+30m chronologisch overzicht

Anti-forensics-signaal:
  <indien timestomping / log-clear / journal-truncation gedetecteerd>

Vondsten geprioriteerd:
  Persistence:        <mechanism + locatie>
  Lateral-movement:   <bewijs van connectie / credential-gebruik>
  Data-exfil:         <bewijs van outbound-volume / staged-archives>
  Malware:            <hash + handoff naar malware-triage>

Open vragen voor specialistisch-forensics:
  - <welke vragen rechtbank-grade-werk vragen>

Handoffs:
  ir-runbook:         <findings → response-actie>
  malware-triage:     <indien sample/memory-extracted-binary>
  ioc-hunter:         <extracted IOCs>
  detection-engineer: <patterns voor toekomstige detection>

Verification-loop: ...
```

## Referenties

- **Volatility 3** — [https://github.com/volatilityfoundation/volatility3](https://github.com/volatilityfoundation/volatility3). Memory-analyse-framework.
- **Plaso / log2timeline** — [https://plaso.readthedocs.io/](https://plaso.readthedocs.io/). Timeline-reconstructie.
- **Timesketch** — [https://timesketch.org/](https://timesketch.org/). Collaborative timeline-analyse.
- **Eric Zimmerman tools** — [https://ericzimmerman.github.io/](https://ericzimmerman.github.io/). MFTECmd, RECmd, EvtxECmd, AmcacheParser, PECmd. Kostenloos, kwaliteit-standaard voor Windows-forensics.
- **KAPE** — [https://www.kroll.com/en/services/cyber-risk/incident-response-litigation-support/kroll-artifact-parser-extractor-kape](https://www.kroll.com/en/services/cyber-risk/incident-response-litigation-support/kroll-artifact-parser-extractor-kape). Live-response artifact-collection.
- **Velociraptor** — [https://docs.velociraptor.app/](https://docs.velociraptor.app/). Endpoint-fleet collection en hunting.
- **SANS DFIR posters** — [https://www.sans.org/posters/](https://www.sans.org/posters/). Per-OS artefact-overview-posters.
- **NIST SP 800-86** — [https://csrc.nist.gov/pubs/sp/800/86/final](https://csrc.nist.gov/pubs/sp/800/86/final). Guide to Integrating Forensic Techniques into Incident Response.
- **MITRE ATT&CK — Defense Evasion (anti-forensics)** — [https://attack.mitre.org/tactics/TA0005/](https://attack.mitre.org/tactics/TA0005/). T1070-class.
- **NCSC-NL Forensic-readiness-richtlijn** — [https://www.ncsc.nl/](https://www.ncsc.nl/). NL-context.

## Categorieën

- blue

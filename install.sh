#!/usr/bin/env bash
#
# Accans Sec Skills — remote installer (curl-pipeable)
#
# Quick start:
#   curl -sSL https://security.accans.com/install.sh | bash -s -- --profile core
#   curl -sSL https://security.accans.com/install.sh | bash -s -- security-review threat-modeler
#   curl -sSL https://security.accans.com/install.sh | bash -s -- --list-profiles
#
# Override base URL (e.g. for staging):
#   curl -sSL https://other.example.com/install.sh | bash -s -- \
#     --base-url https://other.example.com --profile core
#
# Dependencies: curl, jq

set -euo pipefail

BASE_URL="${SEC_INSTALL_BASE_URL:-https://security.accans.com}"
DEST="${HOME}/.claude"
DRY_RUN=0
SELECTED=()
PROFILE=""
ACTION=""

err() { printf >&2 'error: %s\n' "$*"; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || err "missing dependency: $1 (install via your package manager)"; }

usage() {
  cat <<EOF
Accans Sec Skills installer.

Usage:
  install.sh --profile <name>           Install all items in a profile
  install.sh <id> [<id>...]             Install specific items
  install.sh --list-profiles            List profiles + counts
  install.sh --list                     List all items in the catalog

Options:
  --profile <name>      core | appsec | pentest | blue | grc | full
  --dest <path>         Install destination (default: \$HOME/.claude)
  --base-url <url>      Override source URL (default: ${BASE_URL})
  --dry-run             Show what would happen, do not write
  -h, --help            This help

Examples:
  curl -sSL ${BASE_URL}/install.sh | bash -s -- --profile core --dry-run
  curl -sSL ${BASE_URL}/install.sh | bash -s -- security-review threat-modeler
EOF
}

# Argument parsing
while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)        PROFILE="${2:-}"; shift 2 ;;
    --profile=*)      PROFILE="${1#--profile=}"; shift ;;
    --dest)           DEST="${2:-}"; shift 2 ;;
    --dest=*)         DEST="${1#--dest=}"; shift ;;
    --base-url)       BASE_URL="${2:-}"; shift 2 ;;
    --base-url=*)     BASE_URL="${1#--base-url=}"; shift ;;
    --dry-run)        DRY_RUN=1; shift ;;
    --list)           ACTION=list; shift ;;
    --list-profiles)  ACTION=list-profiles; shift ;;
    -h|--help)        usage; exit 0 ;;
    --*)              err "unknown flag: $1 (try --help)" ;;
    *)                SELECTED+=("$1"); shift ;;
  esac
done

# Dependencies
need curl
need jq

# Fetch manifest
MANIFEST_URL="${BASE_URL%/}/manifest.json"
MANIFEST=$(curl -sSL --fail "$MANIFEST_URL" 2>/dev/null) \
  || err "could not fetch ${MANIFEST_URL} (is the host reachable?)"

# Sub-commands that don't need install args
if [[ "$ACTION" == "list-profiles" ]]; then
  echo "$MANIFEST" | jq -r '
    .profiles
    | to_entries[]
    | "  \(.key)\t\(.value.label)\t\(.value.desc // "")"
  ' | column -t -s $'\t'
  exit 0
fi
if [[ "$ACTION" == "list" ]]; then
  echo "$MANIFEST" | jq -r '
    .items[]
    | "  \(.type)\t\(.id)\t\(.name)"
  ' | column -t -s $'\t'
  exit 0
fi

# Validate input
if [[ -n "$PROFILE" && ${#SELECTED[@]} -gt 0 ]]; then
  err "cannot combine --profile with explicit item-IDs"
fi
if [[ -z "$PROFILE" && ${#SELECTED[@]} -eq 0 ]]; then
  err "specify --profile or one or more item-IDs (try --help)"
fi

# Resolve items to install
if [[ -n "$PROFILE" ]]; then
  # Verify profile exists
  if ! echo "$MANIFEST" | jq -e --arg prof "$PROFILE" '.profiles[$prof]' >/dev/null; then
    err "unknown profile: $PROFILE (try --list-profiles)"
  fi
  ITEMS_JSON=$(echo "$MANIFEST" | jq --arg prof "$PROFILE" \
    '[.items[] | select(.profiles | index($prof))]')
else
  IDS_JSON=$(printf '%s\n' "${SELECTED[@]}" | jq -R . | jq -s .)
  ITEMS_JSON=$(echo "$MANIFEST" | jq --argjson ids "$IDS_JSON" \
    '[.items[] | select(.id as $i | $ids | index($i))]')

  # Verify all requested IDs were found
  FOUND_IDS=$(echo "$ITEMS_JSON" | jq -r '.[].id')
  for id in "${SELECTED[@]}"; do
    if ! grep -qFx "$id" <<<"$FOUND_IDS"; then
      err "unknown item: $id (try --list)"
    fi
  done
fi

COUNT=$(echo "$ITEMS_JSON" | jq 'length')
if [[ "$COUNT" -eq 0 ]]; then
  err "no items resolved"
fi

# Plan
printf 'Source:  %s\n' "$BASE_URL"
printf 'Target:  %s\n' "$DEST"
printf 'Items:   %d\n' "$COUNT"
echo

# Install loop
fail=0
while read -r line; do
  id=$(  echo "$line" | jq -r '.id')
  type=$(echo "$line" | jq -r '.type')
  ipath=$(echo "$line" | jq -r '.path')

  case "$type" in
    skill)   src="${BASE_URL%/}/${ipath}/SKILL.md"; tgt="${DEST}/skills/${id}/SKILL.md" ;;
    agent)   src="${BASE_URL%/}/${ipath}";          tgt="${DEST}/agents/${id}.md" ;;
    command) src="${BASE_URL%/}/${ipath}";          tgt="${DEST}/commands/${id}.md" ;;
    *)       err "unknown type: $type" ;;
  esac

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '  would %-7s %s\n        %s\n        -> %s\n' "$type" "$id" "$src" "$tgt"
    continue
  fi

  mkdir -p "$(dirname "$tgt")"
  if curl -sSL --fail "$src" -o "${tgt}.tmp" 2>/dev/null; then
    mv "${tgt}.tmp" "$tgt"
    printf '  ok    %-7s %s\n' "$type" "$id"
  else
    rm -f "${tgt}.tmp"
    printf '  FAIL  %-7s %s (could not fetch %s)\n' "$type" "$id" "$src"
    fail=$((fail + 1))
  fi
done < <(echo "$ITEMS_JSON" | jq -c '.[]')

echo
if [[ "$DRY_RUN" -eq 1 ]]; then
  printf 'Would install %d item(s).\n' "$COUNT"
elif [[ "$fail" -gt 0 ]]; then
  printf 'Installed %d item(s) with %d failure(s) to %s.\n' "$((COUNT - fail))" "$fail" "$DEST"
  exit 1
else
  printf 'Installed %d item(s) to %s.\n' "$COUNT" "$DEST"
fi

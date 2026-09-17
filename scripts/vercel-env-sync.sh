#!/usr/bin/env bash
#
# Sync the secrets in .env.local to Vercel without ever printing a value.
#
# Run this from a machine that can reach api.vercel.com (this CI sandbox cannot).
# It is idempotent: each variable is removed if present, then re-added.
#
#   ./scripts/vercel-env-sync.sh                 # production only
#   ./scripts/vercel-env-sync.sh preview         # production + preview
#   VERCEL_PROJECT=boom-shorts-website ./scripts/vercel-env-sync.sh
#
# Values travel through stdin, so they never appear in the process list, the
# terminal, or the shell history.
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.local}"
ENVS=("production")
[[ "${1:-}" == "preview" ]] && ENVS=("production" "preview")

[[ -f "$ENV_FILE" ]] || { echo "error: $ENV_FILE not found" >&2; exit 1; }

# The CLI token authenticates the push; it must not become a project variable.
SKIP_KEYS=("VERCEL_TOKEN")

VERCEL_BIN="${VERCEL_BIN:-vercel}"
command -v "$VERCEL_BIN" >/dev/null 2>&1 || {
  echo "error: the vercel CLI is not installed. Run: npm i -g vercel" >&2
  exit 1
}

PROJECT_ARG=()
[[ -n "${VERCEL_PROJECT:-}" ]] && PROJECT_ARG=(--project "$VERCEL_PROJECT")

is_skipped() {
  local key="$1" skip
  for skip in "${SKIP_KEYS[@]}"; do [[ "$key" == "$skip" ]] && return 0; done
  return 1
}

# Link once so the CLI does not prompt per variable.
if [[ -z "${VERCEL_PROJECT:-}" && ! -d .vercel ]]; then
  echo "==> This folder is not linked to a Vercel project."
  echo "    Run 'vercel link' first, or set VERCEL_PROJECT=<project-name>."
  exit 1
fi

count=0
while IFS= read -r line; do
  # Skip blanks and comments.
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue

  key="${line%%=*}"
  value="${line#*=}"

  is_skipped "$key" && { echo "  -  $key (skipped: CLI credential)"; continue; }
  [[ -n "$value" ]] || { echo "  -  $key (skipped: empty)"; continue; }

  for env in "${ENVS[@]}"; do
    # Remove first so re-running this script updates rather than errors.
    "$VERCEL_BIN" env rm "$key" "$env" --yes "${PROJECT_ARG[@]}" >/dev/null 2>&1 || true
    # Feed the value via stdin; it is never an argument, so it cannot leak
    # through `ps` or shell history.
    printf '%s' "$value" | "$VERCEL_BIN" env add "$key" "$env" "${PROJECT_ARG[@]}" >/dev/null
    echo "  ✓  $key -> $env"
  done
  count=$((count + 1))
done < "$ENV_FILE"

echo
echo "==> Synced $count variable(s) to ${ENVS[*]}."
echo
echo "Next:"
echo "  1. Remove SUPABASE_SERVICE_ROLE_KEY if the project still has it:"
echo "       vercel env rm SUPABASE_SERVICE_ROLE_KEY production"
echo "     (our code prefers it over SUPABASE_SECRET_KEY, so a stale value would win)"
echo "  2. Redeploy so the new values take effect:"
echo "       vercel --prod"

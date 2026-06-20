#!/usr/bin/env bash
# Deploy Laszlo edge functions to Supabase.
#
#   ./supabase/deploy.sh            # deploy all functions
#   ./supabase/deploy.sh generate   # deploy one
#
# Reads SUPABASE_ACCESS_TOKEN from .env (the sbp_ personal access token).
# Provider secrets are set separately, once — see the SECRETS note at the bottom.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="spbrkgoseabpsxzkkyzj"
FUNCTIONS=(generate transcribe identify speak)

command -v supabase >/dev/null || { echo "supabase CLI not on PATH (see supabase/functions/README.md)"; exit 1; }

export SUPABASE_ACCESS_TOKEN="$(grep -E '^SUPABASE_ACCESS_TOKEN=' "$REPO/.env" | cut -d= -f2-)"
[ -n "$SUPABASE_ACCESS_TOKEN" ] || { echo "SUPABASE_ACCESS_TOKEN missing from .env"; exit 1; }

targets=("$@"); [ ${#targets[@]} -eq 0 ] && targets=("${FUNCTIONS[@]}")

for fn in "${targets[@]}"; do
  echo "▶ deploying $fn"
  supabase functions deploy "$fn" --project-ref "$REF" --use-api
done

# SECRETS (run once, or when a key changes — not needed on every deploy):
#   supabase secrets set --project-ref spbrkgoseabpsxzkkyzj \
#     SCW_BASE_URL=... SCW_API_KEY=...
# SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are auto-injected.

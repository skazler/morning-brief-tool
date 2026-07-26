#!/usr/bin/env bash
# Migrate secrets from the local .env into the Worker.
#
# Values are piped straight into `wrangler secret put` and never echoed, so
# nothing lands in your shell history or scrollback. Idempotent — re-running
# just overwrites each secret with what .env currently says.
#
#   ./scripts/push-secrets.sh

set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "No $ENV_FILE found. Nothing to migrate." >&2
  exit 1
fi

# Everything the Worker reads as a secret. Non-secret settings (TIMEZONE,
# DAILY_HOUR, WEATHER_UNITS, FROM_NAME) live in wrangler.jsonc `vars` instead.
SECRETS=(
  RECIPIENT_NAME
  RECIPIENT_EMAIL
  WEATHER_LOCATION
  RESEND_API_KEY
  RESEND_FROM_ADDRESS
  OPENWEATHER_API_KEY
  GUARDIAN_API_KEY
  DISCORD_WEBHOOK_URL
)

# Read one KEY=value from the env file. Tolerates surrounding quotes and
# trailing whitespace; ignores commented lines.
read_env() {
  local key="$1"
  sed -n "s/^[[:space:]]*${key}=//p" "$ENV_FILE" \
    | tail -n1 \
    | sed -e 's/^["'\'']//' -e 's/["'\''][[:space:]]*$//' -e 's/[[:space:]]*$//'
}

for key in "${SECRETS[@]}"; do
  value="$(read_env "$key" || true)"
  if [ -z "$value" ]; then
    echo "  skip  $key (not set in $ENV_FILE)"
    continue
  fi
  printf '%s' "$value" | npx wrangler secret put "$key" >/dev/null
  echo "  ok    $key"
done

# TRIGGER_SECRET is new — it guards POST /run and GET /preview, which didn't
# exist when this ran on Railway. Generate it once and keep a local copy so you
# can actually call those endpoints.
if [ ! -f .trigger-secret ]; then
  openssl rand -hex 32 > .trigger-secret
  chmod 600 .trigger-secret
  echo "  new   TRIGGER_SECRET → saved to .trigger-secret (gitignored)"
fi
printf '%s' "$(cat .trigger-secret)" | npx wrangler secret put TRIGGER_SECRET >/dev/null
echo "  ok    TRIGGER_SECRET"

echo
echo "Done. Verify with: npx wrangler secret list"

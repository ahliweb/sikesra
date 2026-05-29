#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$(dirname "$SCRIPT_DIR")"
WRANGLER_FILE="$TEMPLATE_DIR/wrangler.jsonc"

REQUIRED_ENV_VARS=(
	"AWCMS_MICRO_SITE_URL"
	"AWCMS_MICRO_STORAGE_PUBLIC_BASE_URL"
	"CLOUDFLARE_ACCOUNT_ID"
	"CLOUDFLARE_API_TOKEN"
	"AWCMS_MICRO_D1_DATABASE_ID"
	"AWCMS_MICRO_SESSION_NAMESPACE_ID"
)

log() {
	printf '[awcms-micro cloudflare] %s\n' "$1"
}

fail() {
	printf '[awcms-micro cloudflare] ERROR: %s\n' "$1" >&2
	exit 1
}

require_file() {
	[[ -f "$1" ]] || fail "Missing required file: $1"
}

require_contains() {
	local needle="$1"
	local path="$2"
	rg -F --quiet "$needle" "$path" || fail "Expected '$needle' in $path"
}

require_not_contains() {
	local needle="$1"
	local path="$2"
	rg -F --quiet "$needle" "$path" && fail "Unexpected '$needle' in $path"
}

require_file "$WRANGLER_FILE"

log "Checking wrangler placeholders and bindings"
require_contains '"pattern": "awcms-micro.ahlikoding.com/*"' "$WRANGLER_FILE"
require_contains '"database_name": "awcms-micro-d1"' "$WRANGLER_FILE"
require_not_contains '"database_id": "REPLACE_WITH_AWCMS_MICRO_D1_DATABASE_ID"' "$WRANGLER_FILE"
require_not_contains '"id": "REPLACE_WITH_AWCMS_MICRO_SESSION_NAMESPACE_ID"' "$WRANGLER_FILE"
require_contains '"binding": "MEDIA"' "$WRANGLER_FILE"
require_contains '"binding": "LOADER"' "$WRANGLER_FILE"
require_contains '"binding": "SESSION"' "$WRANGLER_FILE"
require_contains '"binding": "IMAGES"' "$WRANGLER_FILE"

log "Checking local environment variables"
for name in "${REQUIRED_ENV_VARS[@]}"; do
	value="${!name-}"
	if [[ -z "$value" ]]; then
		fail "Missing required environment variable: $name"
	fi
	if [[ "$value" == REPLACE_WITH_* ]]; then
		fail "Environment variable still uses placeholder value: $name"
	fi
done

log "Cloudflare environment validation passed"

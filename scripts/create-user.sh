#!/usr/bin/env bash
#
# Creates one or more regular users through the public registration endpoint.
#
#   scripts/create-user.sh jane@example.com                    # prompts for a password
#   scripts/create-user.sh jane@example.com 'Str0ngPass'       # password as an argument
#   scripts/create-user.sh a@example.com b@example.com         # several accounts, one password
#
# The API must already be running: scripts/start.sh

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

PASSWORD=""
EMAILS=()

usage() {
  cat <<EOF
Usage: scripts/create-user.sh <email> [more emails...] [password]
       scripts/create-user.sh --password <password> <email> [more emails...]

Creates standard (non-administrator) accounts. To create an administrator,
use scripts/create-admin.sh instead.

Options:
  --password <value>   Password to use. Prompted for if omitted.
  -h, --help           Show this help

Environment:
  API_URL              Default http://localhost:8080
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --password) [ $# -ge 2 ] || die "--password needs a value."; PASSWORD="$2"; shift 2 ;;
    -h|--help)  usage; exit 0 ;;
    -*)         usage >&2; die "Unknown option: $1" ;;
    *)          EMAILS+=("$1"); shift ;;
  esac
done

[ ${#EMAILS[@]} -gt 0 ] || { usage >&2; die "At least one email address is required."; }

# A trailing argument that is plainly not an email is treated as the password, so the documented
# `create-user.sh <email> <password>` form works without a flag.
if [ -z "$PASSWORD" ] && [ ${#EMAILS[@]} -gt 1 ]; then
  last="${EMAILS[$((${#EMAILS[@]} - 1))]}"
  case "$last" in
    *@*.*) ;;
    *) PASSWORD="$last"; unset 'EMAILS[$((${#EMAILS[@]} - 1))]' ;;
  esac
fi

require_command curl
require_command python3
require_api

for email in "${EMAILS[@]}"; do
  validate_email "$email"
done

if [ -z "$PASSWORD" ]; then
  PASSWORD="$(prompt_password 'Password for the new account(s)')"
fi
validate_password "$PASSWORD"

created=0
skipped=0
failed=0

for email in "${EMAILS[@]}"; do
  step "Registering $email"

  body="$(json_object email "$email" password "$PASSWORD")"
  response="$(mktemp)"
  code="$(
    curl -sS -o "$response" -w '%{http_code}' \
      -X POST "$API_URL/api/v1/auth/register" \
      -H 'Content-Type: application/json' \
      --data-binary "$body" 2>/dev/null || echo 000
  )"

  case "$code" in
    201)
      role="$(json_field user.role <"$response" 2>/dev/null || echo USER)"
      ok "$email created (role: $role)"
      created=$((created + 1))
      ;;
    409)
      warn "$email already exists — left untouched."
      skipped=$((skipped + 1))
      ;;
    400)
      detail="$(json_field detail <"$response" 2>/dev/null || echo 'validation failed')"
      warn "$email rejected: $detail"
      python3 -c '
import json, sys
try:
    errors = json.load(open(sys.argv[1])).get("errors") or {}
except Exception:
    errors = {}
for field, message in errors.items():
    print("       %s: %s" % (field, message))
' "$response" >&2 || true
      failed=$((failed + 1))
      ;;
    000)
      rm -f "$response"
      die "Could not reach the API at $API_URL."
      ;;
    *)
      warn "$email failed (HTTP $code): $(json_field detail <"$response" 2>/dev/null || head -c 200 "$response")"
      failed=$((failed + 1))
      ;;
  esac
  rm -f "$response"
done

info ""
info "${C_BOLD}Done${C_RESET}  created: $created  already existed: $skipped  failed: $failed"
if [ "$created" -gt 0 ]; then
  info ""
  info "  Sign in at http://localhost:$FRONTEND_PORT with the password you supplied."
fi

# A failure the caller may want to act on should not look like success.
[ "$failed" -eq 0 ] || exit 1

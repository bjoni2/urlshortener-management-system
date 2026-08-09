#!/usr/bin/env bash
#
# Creates an administrator account.
#
#   scripts/create-admin.sh boss@example.com                 # prompts for a password
#   scripts/create-admin.sh boss@example.com 'Str0ngPass1'
#
# How it works, and why it is not a plain API call
# ------------------------------------------------
# The API has no endpoint that mints an administrator: self-registration always produces a standard
# user, deliberately, so nobody can grant themselves elevated rights. The supported way in is the
# application's own bootstrap mechanism — on start-up, `AdminSeeder` creates the account named by
# `app.security.bootstrap-admin.*` if it does not already exist.
#
# This script therefore restarts the API with those settings pointed at the account you asked for,
# then verifies it by signing in. The step is idempotent: an existing account is left untouched, so
# running this twice never resets a password.

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

EMAIL=""
PASSWORD=""
ASSUME_YES=false

usage() {
  cat <<EOF
Usage: scripts/create-admin.sh <email> [password] [--yes]

Creates an administrator by restarting the API with it configured as the bootstrap
administrator. To create a standard user instead, register through the UI or the
/api/v1/auth/register endpoint, which needs no restart.

Options:
  --password <value>   Password to use. Prompted for if omitted.
  --yes                Do not ask for confirmation before restarting the API.
  -h, --help           Show this help

Environment:
  SPRING_PROFILE       Default h2. On h2 the database is in-memory, so a restart
                       discards all existing data.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --password) [ $# -ge 2 ] || die "--password needs a value."; PASSWORD="$2"; shift 2 ;;
    --yes|-y)   ASSUME_YES=true; shift ;;
    -h|--help)  usage; exit 0 ;;
    -*)         usage >&2; die "Unknown option: $1" ;;
    *)
      if [ -z "$EMAIL" ]; then EMAIL="$1"
      elif [ -z "$PASSWORD" ]; then PASSWORD="$1"
      else usage >&2; die "Unexpected argument: $1"
      fi
      shift ;;
  esac
done

[ -n "$EMAIL" ] || { usage >&2; die "An email address is required."; }

require_command curl
require_command python3
require_command java "Install a JDK 21 or newer."
validate_email "$EMAIL"

if [ -z "$PASSWORD" ]; then
  PASSWORD="$(prompt_password "Password for $EMAIL")"
fi
validate_password "$PASSWORD"

# If the account already exists there is nothing to do, and no reason to disturb a running API.
if api_is_up && login "$EMAIL" "$PASSWORD" >/dev/null 2>&1; then
  ok "$EMAIL already exists and these credentials work. Nothing to do."
  exit 0
fi

info ""
warn "Creating an administrator requires restarting the API."
if [ "$SPRING_PROFILE" = "h2" ]; then
  warn "The 'h2' profile keeps its database in memory, so the restart will DISCARD all"
  warn "existing accounts and short URLs. Use SPRING_PROFILE=dev with PostgreSQL to keep them."
fi
info ""

if ! $ASSUME_YES; then
  printf 'Restart the API now? [y/N] '
  read -r reply
  case "$reply" in
    y|Y|yes|YES) ;;
    *) info "Cancelled. Nothing was changed."; exit 0 ;;
  esac
fi

"$SCRIPT_DIR/stop.sh" --backend >/dev/null 2>&1 || true

step "Starting the API with $EMAIL as the bootstrap administrator"
export BOOTSTRAP_ADMIN_EMAIL="$EMAIL"
export BOOTSTRAP_ADMIN_PASSWORD="$PASSWORD"
export ADMIN_EMAIL="$EMAIL"
export ADMIN_PASSWORD="$PASSWORD"

"$SCRIPT_DIR/start.sh" --backend --profile "$SPRING_PROFILE" >/dev/null || die "The API failed to restart."

# Prove it rather than assume it: a successful sign-in is the only evidence that matters.
step "Verifying the new administrator"
token="$(login "$EMAIL" "$PASSWORD" || true)"
[ -n "$token" ] || die "Could not sign in as $EMAIL after the restart. See $BACKEND_LOG"

role="$(curl -fsS "$API_URL/api/v1/users/me" -H "Authorization: Bearer $token" | json_field role)"
[ "$role" = "ADMIN" ] || die "$EMAIL was created but has role '$role' rather than ADMIN."

# Reach an administrator-only endpoint, so the answer covers authorization and not just identity.
curl -fsS -o /dev/null "$API_URL/api/v1/admin/users" -H "Authorization: Bearer $token" \
  || die "$EMAIL cannot reach the administration endpoints."

info ""
ok "Administrator ready"
info "  Email     $EMAIL"
info "  Role      ADMIN"
info "  Sign in   http://localhost:$FRONTEND_PORT"
info ""
dim "  Later runs of scripts/start.sh will recreate this administrator only if it is missing."

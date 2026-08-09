#!/usr/bin/env bash
#
# Shared configuration and helpers for the scripts in this folder.
# Sourced, never executed directly.
#
# Every setting can be overridden from the environment, so the same scripts work against a local
# run, a colleague's machine or a deployed instance without being edited.

set -euo pipefail

# --- Paths -------------------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Process ids and logs live here so start/stop can find each other across shells.
RUN_DIR="$PROJECT_ROOT/.run"
BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"
BACKEND_LOG="$RUN_DIR/backend.log"
FRONTEND_LOG="$RUN_DIR/frontend.log"

# --- Configuration -----------------------------------------------------------------------------

BACKEND_PORT="${BACKEND_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-4200}"
API_URL="${API_URL:-http://localhost:$BACKEND_PORT}"

# `h2` keeps everything in memory and needs no Docker. Use an empty value or `dev` for PostgreSQL.
SPRING_PROFILE="${SPRING_PROFILE:-h2}"

# Credentials of the seeded administrator, used by scripts that need to authenticate as one.
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@urlshortener.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"

STARTUP_TIMEOUT="${STARTUP_TIMEOUT:-120}"

# --- Output ------------------------------------------------------------------------------------

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'
  C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_BLUE=$'\033[34m'
else
  C_RESET=''; C_BOLD=''; C_DIM=''; C_RED=''; C_GREEN=''; C_YELLOW=''; C_BLUE=''
fi

info()  { printf '%s\n' "$*"; }
step()  { printf '%s==>%s %s\n' "$C_BLUE$C_BOLD" "$C_RESET" "$*"; }
ok()    { printf '%s  ok%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn()  { printf '%swarn%s %s\n' "$C_YELLOW" "$C_RESET" "$*" >&2; }
dim()   { printf '%s%s%s\n' "$C_DIM" "$*" "$C_RESET"; }

# Prints an error and exits. Every failure path goes through this so nothing exits silently.
die() {
  printf '%serror%s %s\n' "$C_RED$C_BOLD" "$C_RESET" "$*" >&2
  exit 1
}

# --- Prerequisites -----------------------------------------------------------------------------

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is required but was not found on your PATH.${2:+ $2}"
}

# --- Process handling --------------------------------------------------------------------------

# True when the pid file exists and names a process that is still alive. A stale file (the process
# died without cleaning up) is reported as not running, and removed so it cannot mislead later.
is_running() {
  local pid_file="$1" pid
  [ -f "$pid_file" ] || return 1
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  rm -f "$pid_file"
  return 1
}

read_pid() { cat "$1" 2>/dev/null || true; }

# Asks a process to exit, then insists. SIGTERM lets the JVM and the dev server shut down cleanly;
# SIGKILL is only reached if that has not happened within the grace period.
stop_pid() {
  local pid="$1" label="$2" waited=0
  kill -0 "$pid" 2>/dev/null || return 0

  kill "$pid" 2>/dev/null || true
  while kill -0 "$pid" 2>/dev/null && [ "$waited" -lt 15 ]; do
    sleep 1
    waited=$((waited + 1))
  done

  if kill -0 "$pid" 2>/dev/null; then
    warn "$label did not stop within 15s; forcing it."
    kill -9 "$pid" 2>/dev/null || true
  fi
}

# Anything listening on a port, whether or not this script started it.
pids_on_port() {
  command -v lsof >/dev/null 2>&1 || return 0
  lsof -ti "tcp:$1" -sTCP:LISTEN 2>/dev/null || true
}

port_is_free() {
  [ -z "$(pids_on_port "$1")" ]
}

# --- Waiting -----------------------------------------------------------------------------------

# Polls a URL until it answers, giving up after STARTUP_TIMEOUT. Also watches the process itself, so
# a crash during start-up is reported straight away instead of after the full timeout.
wait_for_http() {
  local url="$1" label="$2" pid="${3:-}" waited=0

  while [ "$waited" -lt "$STARTUP_TIMEOUT" ]; do
    if curl -fsS -o /dev/null --max-time 3 "$url" 2>/dev/null; then
      return 0
    fi
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
      return 2
    fi
    sleep 1
    waited=$((waited + 1))
    if [ $((waited % 15)) -eq 0 ]; then
      dim "  still waiting for $label (${waited}s)..."
    fi
  done
  return 1
}

# --- API helpers -------------------------------------------------------------------------------

api_is_up() {
  curl -fsS -o /dev/null --max-time 3 "$API_URL/actuator/health" 2>/dev/null
}

require_api() {
  api_is_up || die "The API is not responding at $API_URL. Start it first with: scripts/start.sh"
}

# Reads a field out of a JSON document on stdin. Uses python3 rather than jq, which is not installed
# by default on macOS; an absent field exits non-zero so callers can tell it apart from an empty one.
json_field() {
  python3 -c '
import json, sys
try:
    document = json.load(sys.stdin)
except ValueError:
    sys.exit(1)
value = document
for key in sys.argv[1].split("."):
    if not isinstance(value, dict) or key not in value:
        sys.exit(1)
    value = value[key]
print("" if value is None else value)
' "$1"
}

# Signs in and echoes an access token.
login() {
  local email="$1" password="$2" response
  response="$(
    curl -fsS -X POST "$API_URL/api/v1/auth/login" \
      -H 'Content-Type: application/json' \
      --data-binary "$(json_object email "$email" password "$password")" 2>/dev/null
  )" || return 1
  printf '%s' "$response" | json_field accessToken
}

# Builds a JSON object from key/value pairs, letting python3 handle the escaping. Hand-rolled
# string interpolation would break on a password containing a quote or a backslash.
json_object() {
  python3 -c '
import json, sys
args = sys.argv[1:]
print(json.dumps(dict(zip(args[0::2], args[1::2]))))
' "$@"
}

# Prompts for a password twice, without echoing it. Used when one was not supplied as an argument,
# so a password never has to appear in the shell history or the process list.
prompt_password() {
  local prompt="$1" first second
  printf '%s: ' "$prompt" >&2
  read -rs first; printf '\n' >&2
  printf 'Confirm password: ' >&2
  read -rs second; printf '\n' >&2

  [ "$first" = "$second" ] || die "The passwords do not match."
  [ -n "$first" ] || die "The password cannot be empty."
  printf '%s' "$first"
}

# Mirrors the server-side rule, so an invalid password is caught before a pointless round trip.
validate_password() {
  local password="$1"
  case ${#password} in
    0|1|2|3|4|5|6|7) die "The password must be at least 8 characters." ;;
  esac
  [ ${#password} -le 72 ] || die "The password must be at most 72 characters."
  printf '%s' "$password" | grep -q '[A-Za-z]' || die "The password must contain at least one letter."
  printf '%s' "$password" | grep -q '[0-9]' || die "The password must contain at least one digit."
}

validate_email() {
  printf '%s' "$1" | grep -Eq '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' \
    || die "'$1' does not look like an email address."
}

mkdir -p "$RUN_DIR"

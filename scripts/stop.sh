#!/usr/bin/env bash
#
# Stops the services that were started by start.sh.
#
#   scripts/stop.sh               # stop both
#   scripts/stop.sh --backend     # API only
#   scripts/stop.sh --frontend    # UI only

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

STOP_BACKEND=true
STOP_FRONTEND=true

usage() {
  cat <<EOF
Usage: scripts/stop.sh [options]

Options:
  --backend     Stop only the API
  --frontend    Stop only the UI
  -h, --help    Show this help
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --backend)  STOP_FRONTEND=false; shift ;;
    --frontend) STOP_BACKEND=false; shift ;;
    -h|--help)  usage; exit 0 ;;
    *)          usage >&2; die "Unknown option: $1" ;;
  esac
done

stop_service() {
  local label="$1" pid_file="$2"
  local pid
  pid="$(read_pid "$pid_file")"

  if [ -z "$pid" ]; then
    dim "$label is not running (no pid file)."
    return
  fi

  if ! kill -0 "$pid" 2>/dev/null; then
    dim "$label process ($pid) is already gone."
    rm -f "$pid_file"
    return
  fi

  step "Stopping $label (pid $pid)"
  kill "$pid" 2>/dev/null || true

  local elapsed=0
  while kill -0 "$pid" 2>/dev/null; do
    sleep 1
    elapsed=$(( elapsed + 1 ))
    if [ "$elapsed" -ge 15 ]; then
      warn "$label did not stop gracefully after 15 s – sending SIGKILL"
      kill -9 "$pid" 2>/dev/null || true
      break
    fi
  done

  rm -f "$pid_file"
  ok "$label stopped."
}

$STOP_BACKEND  && stop_service "API"      "$BACKEND_PID_FILE"
$STOP_FRONTEND && stop_service "UI"       "$FRONTEND_PID_FILE"

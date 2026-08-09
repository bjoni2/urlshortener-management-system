#!/usr/bin/env bash
#
# Starts the Spring Boot API and the Angular dev server, then waits until both actually answer.
#
#   scripts/start.sh                  # both, on the in-memory h2 profile
#   scripts/start.sh --backend        # API only
#   scripts/start.sh --frontend       # UI only
#   scripts/start.sh --profile dev    # PostgreSQL via Docker Compose
#
# Logs are written to .run/, and the process ids are recorded there so stop.sh can find them.

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

START_BACKEND=true
START_FRONTEND=true

usage() {
  cat <<EOF
Usage: scripts/start.sh [options]

Options:
  --backend            Start only the API
  --frontend           Start only the UI
  --profile <name>     Spring profile (default: $SPRING_PROFILE; use 'dev' for PostgreSQL)
  -h, --help           Show this help

Environment:
  BACKEND_PORT         Default 8080
  FRONTEND_PORT        Default 4200
  SPRING_PROFILE       Default h2
  STARTUP_TIMEOUT      Seconds to wait for each service (default 120)
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --backend)  START_FRONTEND=false; shift ;;
    --frontend) START_BACKEND=false; shift ;;
    --profile)  [ $# -ge 2 ] || die "--profile needs a value."; SPRING_PROFILE="$2"; shift 2 ;;
    -h|--help)  usage; exit 0 ;;
    *)          usage >&2; die "Unknown option: $1" ;;
  esac
done

require_command curl

start_backend() {
  if is_running "$BACKEND_PID_FILE"; then
    ok "API already running (pid $(read_pid "$BACKEND_PID_FILE")) at $API_URL"
    return
  fi

  if ! port_is_free "$BACKEND_PORT"; then
    die "Port $BACKEND_PORT is already in use by another process. Free it, or set BACKEND_PORT."
  fi

  require_command java "Install a JDK 21 or newer."
  step "Starting the API on port $BACKEND_PORT (profile: ${SPRING_PROFILE:-default})"

  # Prefer the packaged jar when it exists: it starts in seconds. Otherwise fall back to Maven,
  # which will compile first, so a fresh clone works without a separate build step.
  local jar
  jar="$(ls "$BACKEND_DIR"/target/urlshortener-*.jar 2>/dev/null | grep -v -- '-plain\.jar$' | head -1 || true)"

  if [ -n "$jar" ]; then
    dim "  using $(basename "$jar")"
    ( cd "$BACKEND_DIR" && nohup java -jar "$jar" \
        --spring.profiles.active="$SPRING_PROFILE" \
        --server.port="$BACKEND_PORT" >"$BACKEND_LOG" 2>&1 & echo $! >"$BACKEND_PID_FILE" )
  else
    dim "  no packaged jar found; building and running with Maven (this takes longer)"
    ( cd "$BACKEND_DIR" && nohup ./mvnw spring-boot:run \
        -Dspring-boot.run.profiles="$SPRING_PROFILE" \
        -Dspring-boot.run.arguments="--server.port=$BACKEND_PORT" >"$BACKEND_LOG" 2>&1 & echo $! >"$BACKEND_PID_FILE" )
  fi

  local pid status
  pid="$(read_pid "$BACKEND_PID_FILE")"
  set +e
  wait_for_http "$API_URL/actuator/health" "the API" "$pid"
  status=$?
  set -e

  case "$status" in
    0) ok "API ready at $API_URL" ;;
    2) rm -f "$BACKEND_PID_FILE"
       warn "The API exited during start-up. Last lines of $BACKEND_LOG:"
       tail -20 "$BACKEND_LOG" >&2
       die "The API failed to start." ;;
    *) die "The API did not respond within ${STARTUP_TIMEOUT}s. See $BACKEND_LOG" ;;
  esac
}

start_frontend() {
  if is_running "$FRONTEND_PID_FILE"; then
    ok "UI already running (pid $(read_pid "$FRONTEND_PID_FILE")) at http://localhost:$FRONTEND_PORT"
    return
  fi

  if ! port_is_free "$FRONTEND_PORT"; then
    die "Port $FRONTEND_PORT is already in use by another process. Free it, or set FRONTEND_PORT."
  fi

  require_command npm "Install Node.js 20 or newer."

  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    step "Installing frontend dependencies (first run only)"
    ( cd "$FRONTEND_DIR" && npm install ) || die "npm install failed."
  fi

  step "Starting the UI on port $FRONTEND_PORT"
  ( cd "$FRONTEND_DIR" && nohup npm start -- --port "$FRONTEND_PORT" >"$FRONTEND_LOG" 2>&1 & echo $! >"$FRONTEND_PID_FILE" )

  local pid status
  pid="$(read_pid "$FRONTEND_PID_FILE")"
  set +e
  wait_for_http "http://localhost:$FRONTEND_PORT" "the UI" "$pid"
  status=$?
  set -e

  case "$status" in
    0) ok "UI ready at http://localhost:$FRONTEND_PORT" ;;
    2) rm -f "$FRONTEND_PID_FILE"
       warn "The UI exited during start-up. Last lines of $FRONTEND_LOG:"
       tail -20 "$FRONTEND_LOG" >&2
       die "The UI failed to start." ;;
    *) die "The UI did not respond within ${STARTUP_TIMEOUT}s. See $FRONTEND_LOG" ;;
  esac
}

$START_BACKEND && start_backend
$START_FRONTEND && start_frontend

info ""
info "${C_BOLD}Ready${C_RESET}"
$START_FRONTEND && info "  UI        http://localhost:$FRONTEND_PORT"
$START_BACKEND  && info "  API       $API_URL"
$START_BACKEND  && info "  Swagger   $API_URL/swagger-ui.html"
info ""
if $START_BACKEND; then
  info "  Sign in as the seeded administrator:"
  info "    $ADMIN_EMAIL / $ADMIN_PASSWORD"
  info ""
fi
dim "  Logs:  $RUN_DIR/"
dim "  Stop:  scripts/stop.sh"
if [ "$SPRING_PROFILE" = "h2" ]; then
  dim "  Note:  the h2 profile is in-memory, so data is lost when the API stops."
fi

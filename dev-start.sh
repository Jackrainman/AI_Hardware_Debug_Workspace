#!/usr/bin/env bash
set -euo pipefail

die() {
  echo "[dev-start] ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

has_npm_script() {
  local package_json="$1"
  local script_name="$2"

  node -e '
const fs = require("node:fs");
const [packagePath, scriptName] = process.argv.slice(1);
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const script = pkg.scripts?.[scriptName];
process.exit(typeof script === "string" && script.trim().length > 0 ? 0 : 1);
' "$package_json" "$script_name"
}

resolve_repo_path() {
  local value="$1"

  if [[ "$value" = /* ]]; then
    printf '%s\n' "$value"
  else
    printf '%s/%s\n' "$REPO_ROOT" "$value"
  fi
}

start_session() {
  if command -v setsid >/dev/null 2>&1; then
    setsid "$@" &
  else
    "$@" &
  fi
  STARTED_PID=$!
}

stop_process_group() {
  local pid="${1:-}"
  local label="$2"

  if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
    return
  fi

  echo "[dev-start] stopping ${label} (pid ${pid})"
  kill -TERM "-${pid}" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true

  for _ in {1..30}; do
    if ! kill -0 "$pid" 2>/dev/null; then
      wait "$pid" 2>/dev/null || true
      return
    fi
    sleep 0.1
  done

  kill -KILL "-${pid}" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
}

cleanup() {
  local exit_code=$?

  trap - EXIT INT TERM
  echo
  echo "[dev-start] cleaning up local dev services..."
  stop_process_group "${FRONTEND_PID:-}" "frontend"
  stop_process_group "${BACKEND_PID:-}" "backend"
  exit "$exit_code"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

[[ -f "apps/server/package.json" ]] || die "run this script from the repository root: apps/server/package.json not found"
[[ -f "apps/desktop/package.json" ]] || die "run this script from the repository root: apps/desktop/package.json not found"

REPO_ROOT=$(pwd -P)

require_command node
require_command npm
require_command curl

export PROBEFLASH_HOST="${PROBEFLASH_HOST:-127.0.0.1}"
export PROBEFLASH_PORT="${PROBEFLASH_PORT:-4100}"
PROBEFLASH_DB_PATH_INPUT="${PROBEFLASH_DB_PATH:-apps/server/.runtime/probeflash.local.sqlite}"
export PROBEFLASH_WORKSPACE_ID="${PROBEFLASH_WORKSPACE_ID:-workspace-26-r1}"
export PROBEFLASH_WORKSPACE_NAME="${PROBEFLASH_WORKSPACE_NAME:-26年 R1}"
export PROBEFLASH_DESKTOP_HOST="${PROBEFLASH_DESKTOP_HOST:-}"

[[ "$PROBEFLASH_PORT" =~ ^[0-9]+$ ]] || die "PROBEFLASH_PORT must be a number: ${PROBEFLASH_PORT}"

if [[ "$PROBEFLASH_PORT" != "4100" ]]; then
  die "apps/desktop Vite proxy currently targets http://127.0.0.1:4100; keep PROBEFLASH_PORT=4100 unless the proxy is changed"
fi

PROBEFLASH_DB_PATH=$(resolve_repo_path "$PROBEFLASH_DB_PATH_INPUT")
export PROBEFLASH_DB_PATH
mkdir -p "apps/server/.runtime"

if command -v ss >/dev/null 2>&1; then
  if ss -tulpn 2>/dev/null | grep -E "LISTEN.+:${PROBEFLASH_PORT}\b" >/dev/null 2>&1; then
    echo "[dev-start] backend port ${PROBEFLASH_PORT} is already in use." >&2
    echo "[dev-start] inspect it with: ss -tulpn | grep ':${PROBEFLASH_PORT}'" >&2
    exit 1
  fi
fi

BACKEND_COMMAND="node src/server.mjs"
if has_npm_script "apps/server/package.json" "dev"; then
  BACKEND_COMMAND="npm run dev"
elif has_npm_script "apps/server/package.json" "start"; then
  BACKEND_COMMAND="npm run start"
fi

BACKEND_URL="http://${PROBEFLASH_HOST}:${PROBEFLASH_PORT}"
HEALTH_URL="http://127.0.0.1:${PROBEFLASH_PORT}/api/health"
FRONTEND_URL="http://localhost:5173"
if [[ -n "$PROBEFLASH_DESKTOP_HOST" && "$PROBEFLASH_DESKTOP_HOST" != "0.0.0.0" ]]; then
  FRONTEND_URL="http://${PROBEFLASH_DESKTOP_HOST}:5173"
fi

echo "[dev-start] ProbeFlash local development"
echo "[dev-start] backend:    ${BACKEND_URL}"
echo "[dev-start] frontend:   ${FRONTEND_URL}"
echo "[dev-start] sqlite db:  ${PROBEFLASH_DB_PATH_INPUT}"
echo "[dev-start] db actual:  ${PROBEFLASH_DB_PATH}"
echo "[dev-start] stop with:  Ctrl+C"
echo "[dev-start] starting backend with: ${BACKEND_COMMAND}"

case "$BACKEND_COMMAND" in
  "npm run dev")
    start_session bash -c 'cd apps/server && exec npm run dev'
    BACKEND_PID=$STARTED_PID
    ;;
  "npm run start")
    start_session bash -c 'cd apps/server && exec npm run start'
    BACKEND_PID=$STARTED_PID
    ;;
  *)
    start_session bash -c 'cd apps/server && exec node src/server.mjs'
    BACKEND_PID=$STARTED_PID
    ;;
esac

echo "[dev-start] waiting for backend health: ${HEALTH_URL}"
for attempt in {1..40}; do
  if curl --silent --fail --max-time 2 "$HEALTH_URL" >/dev/null; then
    echo "[dev-start] backend health is ready"
    break
  fi

  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    wait "$BACKEND_PID" 2>/dev/null || true
    die "backend exited before health check succeeded"
  fi

  if [[ "$attempt" -eq 40 ]]; then
    die "backend health check timed out after 20 seconds: ${HEALTH_URL}"
  fi

  sleep 0.5
done

echo "[dev-start] starting frontend with: npm run dev"
if [[ -n "$PROBEFLASH_DESKTOP_HOST" ]]; then
  start_session bash -c 'cd apps/desktop && exec npm run dev -- --host "$PROBEFLASH_DESKTOP_HOST"'
  FRONTEND_PID=$STARTED_PID
else
  start_session bash -c 'cd apps/desktop && exec npm run dev'
  FRONTEND_PID=$STARTED_PID
fi

echo "[dev-start] services are running; view Vite output above if it selects a different port"

set +e
wait -n "$BACKEND_PID" "$FRONTEND_PID"
EXITED_STATUS=$?
set -e

echo "[dev-start] one dev service exited; stopping the remaining service"
exit "$EXITED_STATUS"

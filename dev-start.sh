#!/usr/bin/env bash
set -euo pipefail

die() {
  echo "[dev-start] ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

sh_quote() {
  local value="$1"
  value=${value//\'/\'\\\'\'}
  printf "'%s'" "$value"
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

cleanup_plain() {
  local exit_code=$?

  trap - EXIT INT TERM
  echo
  echo "[dev-start] cleaning up local dev services..."
  stop_process_group "${FRONTEND_PID:-}" "frontend"
  stop_process_group "${BACKEND_PID:-}" "backend"
  exit "$exit_code"
}

init_context() {
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
}

check_backend_port_available() {
  if command -v ss >/dev/null 2>&1; then
    if ss -tulpn 2>/dev/null | grep -E "LISTEN.+:${PROBEFLASH_PORT}\b" >/dev/null 2>&1; then
      echo "[dev-start] backend port ${PROBEFLASH_PORT} is already in use." >&2
      echo "[dev-start] inspect it with: ss -tulpn | grep ':${PROBEFLASH_PORT}'" >&2
      exit 1
    fi
  fi
}

print_overview() {
  local layout="$1"

  echo "[dev-start] ProbeFlash local development"
  echo "[dev-start] layout:     ${layout}"
  echo "[dev-start] backend:    ${BACKEND_URL}"
  echo "[dev-start] frontend:   ${FRONTEND_URL}"
  echo "[dev-start] sqlite db:  ${PROBEFLASH_DB_PATH_INPUT}"
  echo "[dev-start] db actual:  ${PROBEFLASH_DB_PATH}"
  echo "[dev-start] stop with:  Ctrl+C"
}

wait_for_backend_health() {
  local backend_pid="${1:-}"

  echo "[dev-start] waiting for backend health: ${HEALTH_URL}"
  for attempt in {1..40}; do
    if curl --silent --fail --max-time 2 "$HEALTH_URL" >/dev/null; then
      echo "[dev-start] backend health is ready"
      return
    fi

    if [[ -n "$backend_pid" ]] && ! kill -0 "$backend_pid" 2>/dev/null; then
      wait "$backend_pid" 2>/dev/null || true
      die "backend exited before health check succeeded"
    fi

    if [[ "$attempt" -eq 40 ]]; then
      die "backend health check timed out after 20 seconds: ${HEALTH_URL}"
    fi

    sleep 0.5
  done
}

run_backend_command() {
  echo "[dev-start] starting backend with: ${BACKEND_COMMAND}"

  case "$BACKEND_COMMAND" in
    "npm run dev")
      cd apps/server
      exec npm run dev
      ;;
    "npm run start")
      cd apps/server
      exec npm run start
      ;;
    *)
      cd apps/server
      exec node src/server.mjs
      ;;
  esac
}

run_frontend_command() {
  echo "[dev-start] starting frontend with: npm run dev"

  cd apps/desktop
  if [[ -n "$PROBEFLASH_DESKTOP_HOST" ]]; then
    exec npm run dev -- --host "$PROBEFLASH_DESKTOP_HOST"
  fi
  exec npm run dev
}

run_plain() {
  check_backend_port_available
  print_overview "single terminal"
  echo "[dev-start] starting backend with: ${BACKEND_COMMAND}"

  trap cleanup_plain EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM

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

  wait_for_backend_health "$BACKEND_PID"

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
}

run_backend_pane() {
  check_backend_port_available
  print_overview "tmux split, left pane backend"
  run_backend_command
}

run_frontend_pane() {
  print_overview "tmux split, right pane frontend"
  wait_for_backend_health
  run_frontend_command
}

build_tmux_env_prefix() {
  printf 'PROBEFLASH_HOST=%s ' "$(sh_quote "$PROBEFLASH_HOST")"
  printf 'PROBEFLASH_PORT=%s ' "$(sh_quote "$PROBEFLASH_PORT")"
  printf 'PROBEFLASH_DB_PATH=%s ' "$(sh_quote "$PROBEFLASH_DB_PATH_INPUT")"
  printf 'PROBEFLASH_WORKSPACE_ID=%s ' "$(sh_quote "$PROBEFLASH_WORKSPACE_ID")"
  printf 'PROBEFLASH_WORKSPACE_NAME=%s ' "$(sh_quote "$PROBEFLASH_WORKSPACE_NAME")"
  printf 'PROBEFLASH_DESKTOP_HOST=%s ' "$(sh_quote "$PROBEFLASH_DESKTOP_HOST")"
  printf 'PROBEFLASH_TMUX=0 '
}

build_tmux_command() {
  local pane_mode="$1"

  printf 'cd %s && %s%s %s' \
    "$(sh_quote "$REPO_ROOT")" \
    "$(build_tmux_env_prefix)" \
    "$(sh_quote "${REPO_ROOT}/dev-start.sh")" \
    "$pane_mode"
}

attach_or_switch_tmux() {
  local session="$1"

  if [[ -n "${TMUX:-}" ]]; then
    tmux switch-client -t "$session"
  else
    tmux attach-session -t "$session"
  fi
}

launch_tmux_split() {
  require_command tmux

  local session="${PROBEFLASH_TMUX_SESSION:-probeflash-dev}"
  [[ "$session" =~ ^[A-Za-z0-9_.-]+$ ]] || die "PROBEFLASH_TMUX_SESSION may only contain letters, numbers, dot, underscore, and dash"

  if tmux has-session -t "$session" 2>/dev/null; then
    echo "[dev-start] attaching existing tmux session: ${session}"
    attach_or_switch_tmux "$session"
    return
  fi

  check_backend_port_available

  local backend_command
  local frontend_command
  backend_command=$(build_tmux_command "--backend-pane")
  frontend_command=$(build_tmux_command "--frontend-pane")

  print_overview "tmux split, left backend / right frontend"
  echo "[dev-start] tmux session: ${session}"
  echo "[dev-start] closing either pane stops the whole dev session"

  tmux new-session -d -s "$session" -n dev "$backend_command"
  tmux split-window -h -t "$session:dev" "$frontend_command"
  tmux select-pane -t "$session:dev.0" -T backend
  tmux select-pane -t "$session:dev.1" -T frontend
  tmux select-layout -t "$session:dev" even-horizontal >/dev/null
  tmux set-hook -t "$session" pane-exited "kill-session -t ${session}"

  attach_or_switch_tmux "$session"
}

should_launch_tmux() {
  local preference="${PROBEFLASH_TMUX:-auto}"

  case "$preference" in
    0 | false | off | no)
      return 1
      ;;
    1 | true | on | yes)
      return 0
      ;;
  esac

  [[ -t 0 && -t 1 ]] || return 1
  command -v tmux >/dev/null 2>&1 || return 1
  return 0
}

main() {
  local mode="${1:-run}"
  [[ $# -le 1 ]] || die "usage: ./dev-start.sh [--plain|--tmux|--backend-pane|--frontend-pane]"

  init_context

  case "$mode" in
    run)
      if should_launch_tmux; then
        launch_tmux_split
      else
        run_plain
      fi
      ;;
    --plain)
      run_plain
      ;;
    --tmux)
      launch_tmux_split
      ;;
    --backend-pane)
      run_backend_pane
      ;;
    --frontend-pane)
      run_frontend_pane
      ;;
    *)
      die "unknown argument: ${mode}"
      ;;
  esac
}

main "$@"

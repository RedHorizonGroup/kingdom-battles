#!/usr/bin/env bash
# Regression runner for the crown-cheat / battle-save-integrity fix.
#
#   bash tests/qa/run-regression.sh
#
# Phase 1 serves this working tree and runs tests/qa/regression_crown_cheat.py
#   -> must PASS.
# Phase 2 stages the same tree with the pre-fix game.js (the newest revision of
#   game.js that still contained the 'm' crown cheat) and runs the same test
#   -> must FAIL. A regression test that cannot fail is worthless, so the
#   runner proves it can before reporting success.
#
# The runner is self-contained: a machine with no playwright gets one. When the
# ambient python3 cannot import playwright it provisions a venv (default
# ~/.cache/kingdom-battles-qa/venv), pip installs playwright into it and fetches
# the chromium build the test drives. The venv is kept, so only the first run
# pays for it, and the phases below are unchanged.
#
# Env:
#   PYTHON=<interpreter>        use it as-is; it must already import playwright
#   KB_BOOTSTRAP=0              never install anything; fail if playwright is missing
#   KB_BASE_PYTHON=<interp>     interpreter to provision the venv from (default python3)
#   KB_VENV_DIR=<dir>           where that venv lives (default ~/.cache/kingdom-battles-qa/venv)
#   KB_GAME_ROOT=<dir>          serve this tree instead; skips phase 2
#   KB_PREFIX_GAME_JS=<file>    use this file as the pre-fix game.js in phase 2
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PYTHON="${PYTHON:-}"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/kb-regression.XXXXXX")"
trap 'rm -rf "$WORK"; jobs -p | xargs -r kill 2>/dev/null' EXIT
VENV_DIR="${KB_VENV_DIR:-${XDG_CACHE_HOME:-${HOME:-/tmp}/.cache}/kingdom-battles-qa/venv}"

fail() { printf '\n[FAIL] %s\n' "$1"; exit 1; }
note() { printf '%s\n' "$1"; }
can_import() { "$1" -c 'import playwright' >/dev/null 2>&1; }
log_tail() { tail -3 "$WORK/venv.log" 2>/dev/null; }

# Chooses the interpreter the whole run uses, and provisions it when nothing
# usable is on the machine. Sets PYTHON; never returns without it.
resolve_python() {
  local base vp
  if [ -n "$PYTHON" ]; then
    can_import "$PYTHON" || fail "PYTHON=$PYTHON cannot import playwright — install it there (python3 -m pip install playwright && python3 -m playwright install chromium), or unset PYTHON to let this runner provision one"
    note "python: $PYTHON (from PYTHON — nothing provisioned)"
    return 0
  fi
  base="${KB_BASE_PYTHON:-python3}"
  command -v "$base" >/dev/null 2>&1 || fail "no '$base' on PATH to provision from — install python3, or set PYTHON=<interpreter> that already imports playwright"
  if can_import "$base"; then
    PYTHON="$(command -v "$base")"
    note "python: $PYTHON (already imports playwright)"
    return 0
  fi
  if [ "${KB_BOOTSTRAP:-1}" = 0 ]; then
    fail "$base cannot import playwright and KB_BOOTSTRAP=0, so nothing was installed
       drop KB_BOOTSTRAP to provision $VENV_DIR, or set PYTHON=<interpreter> to one that has playwright:
       python3 -m pip install playwright && python3 -m playwright install chromium"
  fi
  vp="$VENV_DIR/bin/python"
  note "python: $base ($("$base" -c 'import sys; print(sys.version.split()[0])')) cannot import playwright"
  if can_import "$vp"; then
    note "venv: $VENV_DIR already has playwright, reusing it"
  else
    note "bootstrapping: venv at $VENV_DIR, playwright + its chromium build (needs network once)"
    "$base" -m venv "$VENV_DIR" >>"$WORK/venv.log" 2>&1 \
      || fail "could not create a venv at $VENV_DIR — $base needs its venv module (apt install python3-venv):
$(log_tail)"
    "$vp" -m pip install --quiet --disable-pip-version-check playwright >>"$WORK/venv.log" 2>&1 \
      || fail "could not pip install playwright into $VENV_DIR (network, proxy or index?):
$(log_tail)"
  fi
  "$vp" -m playwright install chromium >>"$WORK/venv.log" 2>&1 \
    || fail "could not fetch the chromium build playwright drives:
$(log_tail)"
  can_import "$vp" || fail "$vp still cannot import playwright after installing it:
$(log_tail)"
  PYTHON="$vp"
  note "python: $PYTHON (self-provisioned)"
}
resolve_python

# serve <dir> <portfile> -> echoes the base url once the origin answers
serve() {
  local dir="$1" port_file="$2" port
  port="$("$PYTHON" -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')"
  "$PYTHON" -m http.server "$port" --bind 127.0.0.1 --directory "$dir" >"$WORK/http.log" 2>&1 &
  for _ in $(seq 1 100); do
    if "$PYTHON" - "$port" <<'PY' 2>/dev/null
import socket, sys
socket.create_connection(("127.0.0.1", int(sys.argv[1])), 0.2).close()
PY
    then echo "http://127.0.0.1:$port"; return 0; fi
    sleep 0.1
  done
  fail "static server for $dir never came up"
}

run_test() { # <label> <dir> <want: pass|fail> -> 0 when the outcome is as wanted
  local label="$1" dir="$2" want="$3" base rc
  base="$(serve "$dir" "$WORK/$label.port")" || return 1
  printf '\n--- %s: %s -> %s (expect %s)\n' "$label" "$dir" "$base" "$want"
  "$PYTHON" "$HERE/regression_crown_cheat.py" "$base" "$WORK/evidence-$label"
  rc=$?
  if [ "$want" = pass ]; then
    [ "$rc" -eq 0 ] || { printf '\n[FAIL] %s: regression test did not pass on the fixed build\n' "$label"; return 1; }
  else
    [ "$rc" -ne 0 ] || { printf '\n[FAIL] %s: regression test PASSED on the pre-fix build, so it proves nothing\n' "$label"; return 1; }
  fi
  return 0
}

# --- phase 1: the fixed tree ------------------------------------------------
if [ -n "${KB_GAME_ROOT:-}" ]; then
  run_test fixed "$KB_GAME_ROOT" pass || fail "regression test failed against $KB_GAME_ROOT"
  printf '\nPASS: regression test passes against %s (phase 1 only — KB_GAME_ROOT set)\n' "$KB_GAME_ROOT"
  exit 0
fi
run_test fixed "$ROOT" pass || fail "regression test failed against the fixed tree"

# --- phase 2: the same tree with the pre-fix game.js ------------------------
PREFIX_SHA="$(git -C "$ROOT" rev-list HEAD -- game.js 2>/dev/null | while read -r sha; do
  if git -C "$ROOT" show "$sha:game.js" 2>/dev/null | grep -q "key === 'm'"; then echo "$sha"; break; fi
done)"
PREFIX_TREE="$WORK/prefix"
mkdir -p "$PREFIX_TREE"
rsync -a --exclude '.git' --exclude 'tests' "$ROOT/" "$PREFIX_TREE/"
if [ -n "${KB_PREFIX_GAME_JS:-}" ]; then
  cp "$KB_PREFIX_GAME_JS" "$PREFIX_TREE/game.js"
  PREFIX_SHA="file:$KB_PREFIX_GAME_JS"
elif [ -n "$PREFIX_SHA" ]; then
  git -C "$ROOT" show "$PREFIX_SHA:game.js" >"$PREFIX_TREE/game.js"
else
  fail "no pre-fix game.js found in history — set KB_PREFIX_GAME_JS=<file> to the old game.js"
fi
printf '\npre-fix game.js: %s\n' "$PREFIX_SHA"
run_test prefix "$PREFIX_TREE" fail || fail "regression test did not fail on the pre-fix build"

printf '\nPASS: fixed build passes the regression test, pre-fix build (%s) fails it\n' "$PREFIX_SHA"

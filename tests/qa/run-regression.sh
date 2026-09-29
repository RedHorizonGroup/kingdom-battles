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
# Env:
#   PYTHON=<interpreter>        default python3 (needs `playwright` installed)
#   KB_GAME_ROOT=<dir>          serve this tree instead; skips phase 2
#   KB_PREFIX_GAME_JS=<file>    use this file as the pre-fix game.js in phase 2
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PYTHON="${PYTHON:-python3}"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/kb-regression.XXXXXX")"
trap 'rm -rf "$WORK"; jobs -p | xargs -r kill 2>/dev/null' EXIT

fail() { printf '\n[FAIL] %s\n' "$1"; exit 1; }

if ! "$PYTHON" -c 'import playwright' 2>/dev/null; then
  fail "$PYTHON cannot import playwright — install it (pip install playwright && python3 -m playwright install chromium)"
fi

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

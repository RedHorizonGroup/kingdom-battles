# Kingdom Battles

Fresh start-from-scratch implementation for the Kingdom Battles brief. This directory is intentionally independent from the preserved historical build at commit `bb3c749`.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173`. The game has no server or account dependency; campaign state is stored in localStorage and the shell is cached by the service worker.

## Dev mode

Opening the page with `?kbdev=1` (`http://127.0.0.1:4173/?kbdev=1`) unlocks the QA-only
write hooks on `window.KB` — `KB.grantCrowns(n)` and `KB.setState(patch)`. They are how
the Playwright contract reaches expensive states, they are not player features, and on a
normal load they are **not defined**: you cannot mint or rewrite crowns from the keyboard
or the console. Everything else on `window.KB` (reading state, calling the real actions)
is present either way, so the contract only needs the flag for the two grants.

Do not re-export those two unconditionally. `tests/qa/run-regression.sh` asserts they are
absent without the flag, and the keyboard has no crown cheat at all: an in-progress battle
is persisted with the save, so a refresh mid-fight resumes it rather than forfeiting it.

## Tests

```bash
python3 -m pip install playwright && python3 -m playwright install chromium
bash tests/qa/run-regression.sh
```

The runner serves the working tree, drives the real page, and then stages the pre-fix
`game.js` and runs the same test against it, so it only reports success if the test both
passes on the fixed build and fails on the broken one. Point it at any checkout with
`KB_GAME_ROOT=<dir> bash tests/qa/run-regression.sh`.

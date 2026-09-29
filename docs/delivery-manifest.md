# Kingdom Battles delivery manifest — BUILD 4 rebuild (2026-09-22)

```yaml
repo: RedHorizonGroup/kingdom-battles
branch: main
remote_head: b8e15279fa64bf56d8c243a97be356a1295b89a6
rebuild_branch: rebuild/cinderwatch-v4
rebuild_head: 703e6b22f7655b1265fff80eaba2721bcc5cc251
embedded_marker: BUILD 4
live_url: https://kingdom-battles.vercel.app/
production_deployment_id: dpl_GpMQcYwPv5fXHqFFxvdwkh1A71kx
production_deployment_url: https://kingdom-battles-kyqfcadgl-red-horizons-projects.vercel.app
preview_deployment_id: dpl_D4rqLkfmMpxjbYzdx4X3b2VtYZwi
preview_url: https://kingdom-battles-e953jd25c-red-horizons-projects.vercel.app
status: delivered-live
```

## Evidence

- **Freshness.** `git merge-base --is-ancestor bb3c749 HEAD` exits 128
  (`fatal: Not a valid object name bb3c749`); `git log --oneline --all` shows only the
  accepted fresh-build line (`6aa63fc` · `df53d93` · `affc690` · `a3e8e7c`). The rejected
  runtime is not an ancestor and is absent from the object graph. See `docs/freshness-proof.md`.
- **Gated push (rebuild branch).** `python -m rig git-push --branch rebuild/cinderwatch-v4`
  → `pushed: true`, `verified: true`, remote head `703e6b22f7655b1265fff80eaba2721bcc5cc251`,
  `GIT_PUSH` seq 913621.
- **Gated push (main).** `python -m rig git-push --branch main --allow-main-push --criteria-met`
  → `pushed: true`, `verified: true`, remote head `b8e15279fa64bf56d8c243a97be356a1295b89a6`,
  `GIT_PUSH` seq 913740.
- **Vercel preview.** `vercel deploy` → `dpl_D4rqLkfmMpxjbYzdx4X3b2VtYZwi`,
  `https://kingdom-battles-e953jd25c-red-horizons-projects.vercel.app` (READY, sha `703e6b2`).
- **Vercel production.** `vercel --prod` → `dpl_GpMQcYwPv5fXHqFFxvdwkh1A71kx`,
  aliased to `https://kingdom-battles.vercel.app` (READY, sha `b8e1527`).
- **Live contract.** The 8-point Playwright contract was run three times — localhost,
  the live preview origin, and the live production origin `https://kingdom-battles.vercel.app`.
  All three runs passed 8/8 with zero console/page errors. Evidence:
  `tests/qa/evidence/evidence-local.json`, `evidence-preview.json`, `evidence-production.json`
  plus the per-point screenshots (`production-0*.png`).
- **Served marker.** `curl https://kingdom-battles.vercel.app/index.html` contains `BUILD 4`;
  `sw.js` serves cache `kingdom-battles-cinderwatch-v4`.

## Note on preview vs production ordering

The Vercel project has no Git link (`link: null`), so a branch push does not auto-create a
preview. The preview was produced with `vercel deploy` from the branch working tree, and
production with `vercel --prod` after merging to `main`. The non-circular sequence holds:
the preview proved the build, production proved the delivery, and point 8 was evaluated on
the production URL.

## 2026-09-29 — crown cheat removed, battle save no longer forfeited (branch fix/crown-cheat-and-battle-save-integrity)

```yaml
branch: fix/crown-cheat-and-battle-save-integrity
base: main (0cf9584)
scope: game.js, tests/qa/, README.md, docs/delivery-manifest.md
status: verified-by-execution
```

- **Defect.** `game.js` bound a global `keydown` handler that added 2 crowns per `m`
  press with no dev flag, no cap and no view gate, and `save()` wrote
  `{ ...state, battle: null }`, so any save during a battle silently discarded that
  battle. `window.KB.grantCrowns` / `setState` were exported to every player load.
- **Fix.** The `m` handler is deleted. `grantCrowns` and `setState` are attached only
  when the URL carries `?kbdev=1`. `save()` persists the live battle and `load()`
  restores it, so a mid-battle refresh resumes the fight; an ended battle is dropped on
  load (its reward is already banked, so it can never pay out twice) and a corrupt or
  partial `battle` object is discarded rather than rendered.
- **Regression test.** `tests/qa/run-regression.sh` exits 0 on this branch and non-zero
  against `game.js` at `703e6b2`: 10/10 checks pass on the fixed build, 7 fail on the
  pre-fix build (m-key crowns, absent hooks, m-key in battle, battle refresh, restored
  unit name/colour, partial-save units, single payout). `tests/qa/qa_contract.py` passes
  8/8; it needed two edits, the `?kbdev=1` opt-in and the v4→v5 cache assertion.

## 2026-09-29 — cache and asset version bumped so the fixed game.js reaches returning players (branch fix/crown-cheat-and-battle-save-integrity)

```yaml
branch: fix/crown-cheat-and-battle-save-integrity
base: main (0cf9584) + 4c4326d, 8a4a355
scope: sw.js, index.html, game.js, tests/qa/qa_contract.py, docs/delivery-manifest.md
status: verified-by-execution
```

- **Defect.** The fix above shipped new bytes for `game.js`, but nothing invalidated the
  service worker. `sw.js` kept the cache name `kingdom-battles-cinderwatch-v4` and
  precached `./game.js?v=4`, and `index.html` requested `game.js?v=4` — the URL the v4
  cache already held. A returning player was therefore served the **pre-fix** `game.js`
  from cache and still had the `m` crown cheat reachable, with no way to tell.
- **Fix.** `sw.js` `CACHE` is now `kingdom-battles-cinderwatch-v5`, `kingdom-battles-cinderwatch-v4`
  is prepended to `OLD_CACHES` so `activate` deletes it, and the precached asset is
  `./game.js?v=5`; `index.html` requests `game.js?v=5`. `game.js` `CACHE_NAME` moves to
  `kingdom-battles-cinderwatch-v5` so it names the cache the worker actually opens.
- **Save key deliberately unchanged.** The localStorage save key stays
  `kingdom-battles-cinderwatch-v4` (`game.js` `KEY`). It used to be the same *string* as
  the old cache name, so a find-and-replace bump would have silently renamed the save
  key and reset every returning player's campaign. `KEY` now carries a comment saying so.
- **Verified by execution.** A returning-player replay, on one origin and one browser
  profile: load the pre-fix build (`sw.js` v4, `game.js` at `703e6b2`, with the `m` cheat)
  and seed a real v4-keyed save; then swap the served tree to this build and reload. The
  player receives the fixed `game.js` (`m` cheat gone, `KB.grantCrowns` absent, script
  `game.js?v=5`), the v4 cache is purged, and the v4-keyed save (7777 crowns, 2 levels
  cleared) loads into memory intact. `tests/qa/qa_contract.py` passes 8/8 with
  `caches=['kingdom-battles-cinderwatch-v5']`; `bash tests/qa/run-regression.sh` exits 0.
- **Regression runner is self-provisioning.** The first version of `run-regression.sh`
  hard-failed when the ambient `python3` had no `playwright`, which is not hypothetical:
  the rig venv was rebuilt mid-task and lost it, and check c1 went red on the close
  gate's own re-run. It now resolves its own interpreter — an explicit `PYTHON` is used
  as-is, an ambient `python3` that already imports `playwright` is left alone, and
  anything else is provisioned into a kept venv (`$XDG_CACHE_HOME/kingdom-battles-qa/venv`)
  with `playwright install chromium`. Verified from a cold cache with an empty
  `PLAYWRIGHT_BROWSERS_PATH`: 590 MB fetched, exit 0 in 2:49, 10/10 then 3/10. Set
  `KB_BOOTSTRAP=0` to forbid installing, or `KB_VENV_DIR` to relocate the venv.

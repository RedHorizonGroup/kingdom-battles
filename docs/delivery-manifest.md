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

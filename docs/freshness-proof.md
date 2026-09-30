# Freshness proof — BUILD 4 rebuild

Recorded before delivery for the BUILD 4 rebuild of Kingdom Battles.

- Repository: `RedHorizonGroup/kingdom-battles` (HTTPS clone only; the SSH key is refused).
- Rebuild branch: `rebuild/cinderwatch-v4`, authored off `main` head `6aa63fc`.
- Historical rejected runtime: `bb3c749`.
- Independence check (executed): `git merge-base --is-ancestor bb3c749 HEAD` → exit 128
  (`fatal: Not a valid object name bb3c749`). The rejected runtime is not an ancestor
  and is not present in this repository's object graph at all.
- Historical line (executed): `git log --oneline --all` →
  `6aa63fc` (main head) · `df53d93` · `affc690` · `a3e8e7c` — the accepted fresh-build
  line only; no preserved-runtime commit appears.
- Source boundary: the BUILD 4 page surface (`index.html`, `styles.css`, `game.js`,
  `sw.js`, `manifest.webmanifest`) is newly authored; the BUILD 3 runtime is not
  imported as a module or copied into the new tree. The superseded `main` head
  `6aa63fc` remains the independent-history base.
- Identity marker: the page footer and delivery manifest say `BUILD 4`; the local
  storage key is `kingdom-battles-cinderwatch-v4`; the service-worker cache is
  `kingdom-battles-cinderwatch-v4`.

## Reproduced checks

```text
$ git merge-base --is-ancestor bb3c749 HEAD
fatal: Not a valid object name bb3c749          # exit 128 — not an ancestor

$ git log --oneline --all
6aa63fc Record live deployment verification boundary
df53d93 Rebuild Cinderwatch battle experience
affc690 Deepen Kingdom Battles strategy loop
a3e8e7c Build Kingdom Battles fresh game

$ grep -rn "kingdom-battles-cinderwatch-v4" game.js sw.js | wc -l
2
```

## Addendum — 2026-09-29 (branch `fix/crown-cheat-and-battle-save-integrity`)

The identity claim above is a record of BUILD 4 as verified on 2026-09-22, and the
reproduced block is left exactly as it was run. Since then:

- The **service-worker cache** moved `kingdom-battles-cinderwatch-v4` → `-v5`, and
  `game.js` is now requested as `game.js?v=5`. Without this, `sw.js` is cache-first and
  the unmodified worker would have kept serving returning players the pre-fix
  `game.js?v=4` — the crown cheat would have stayed live in the installed base.
- The **localStorage save key** is deliberately *still* `kingdom-battles-cinderwatch-v4`
  (and `KEY_V3` still `-v3`) so every returning campaign survives the cache bump. The two
  strings used to be identical, which makes a careless global rename silently reset
  everyone's progress; `game.js` now carries a comment saying so.
- The `grep | wc -l → 2` result above no longer holds, for the same reason.
# Freshness proof

Recorded before delivery for the Kingdom Battles restart.

- Target directory: `fresh-kingdom-battles/`.
- Historical rejected runtime: `bb3c749`.
- Fresh repository commits: `a3e8e7c` and `affc690`.
- Independence check: `git merge-base --is-ancestor bb3c749 HEAD` must fail; a successful merge-base would invalidate this restart.
- Source boundary: no preserved runtime source is copied into this directory; the implementation uses new HTML/CSS/JavaScript and inline SVG symbols.
- Identity marker: the page footer says `BUILD 3`, and the storage key is `kingdom-battles-cinderwatch-v3`.

The target was inspected before edits. The existing fresh repository was not deleted because it was proven to be a distinct repository with a fresh history and the remote conflict was resolved in favor of preserving that valid fresh identity rather than destroying it. The rejected build is not reused.

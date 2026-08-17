# Kingdom Battles — fresh build design

This is a new implementation, not a continuation of the preserved `bb3c749` tree. The game is a touch-first lane strategy game where a capital investment changes the army available in the next short battle.

## Architecture

- `index.html`: accessible application shell, capital and battle views, inline SVG sprite definitions.
- `styles.css`: one token system and responsive layout; no external runtime dependency.
- `game.js`: state machine, economy, prerequisite graph, battle simulation, local persistence, and view rendering.
- `manifest.webmanifest` + `sw.js`: installable offline shell.
- `docs/design-fresh.md`: this design and verification contract.

```
capital -> buildings/resources -> class tree prerequisites -> roster -> battle lane
   ^                                                       |
   +-------- victory reward / defeat-safe local save <-----+
```

## Visual system

Dusk ink `#101827`, parchment `#f4ead5`, ember `#e56b45`, cobalt `#3567d4`, moss `#6e9d62`, and brass `#e5b85c`. Display uses `Cinzel Decorative` when available with Georgia fallback; body uses system sans. The signature is the animated heraldic unit sigil: each unit card carries a colored SVG crest that pulses when its class-tree node unlocks.

## Gameplay

Capital starts with 120 crowns and generates 2 crowns every 2 seconds. Barracks unlocks Scout; Watchtower unlocks Archer; Stable unlocks Lancer; Workshop requires Barracks; Sanctum requires Watchtower + Workshop. Ember Knight requires Stable + Workshop + Lancer. The battle is a single lane: player keep and enemy keep, income, deployable roster, direct command boost, keep volley, and win/lose terminal states. Tips change with state and are persisted only locally.

## Verification plan

1. System questions: live `inspect` output and Notion Result.
2. Freshness: new directory, initial commit history, and gated main push with a head different from `bb3c749`.
3. Capital/tree: browser assertions buy buildings and show prerequisite locked/unlocked nodes.
4. Battle: browser clicks deploy, command, volley, retreat, and observes state changes; screenshots cover capital, battle, win/lose.
5. PWA/save: fetch manifest/service worker, clear/reload and inspect localStorage, then reload from an offline-capable cached shell.
6. Responsive/accessibility: 375px and desktop screenshots, keyboard focus and reduced-motion CSS.
7. Live delivery: remote main head plus deployment id and live URL.

## Risks and fallbacks

- Source drawing is a historical reference only; if no additional image is recoverable, preserve the trace and use original SVG silhouettes rather than copying old code.
- Browser lease loss means wait/replan, never reuse the preserved build.
- Vercel or GitHub auth failure is reported as an external blocker with raw command evidence.
- Offline network cannot run deployment APIs; the game is deliberately local-only and service-worker cached.

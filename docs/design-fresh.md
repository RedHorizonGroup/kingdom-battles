# Cinderwatch fresh-build contract

This is a new implementation for the Kingdom Battles restart. It does not import code or history from the preserved `bb3c749` build.

## Product direction

A touch-first heraldic strategy game: spend capital income on a building family, unlock a doctrine only when its building combination is complete, then commit that economy to a short keep-pressure battle. The pencil reference inventory maps to 15 buildings and 12 playable doctrine families: Barracks/Scout, Fletchery/Archer, Mansion/Boss, Stables/Cavalry, Mage Tower/Wizard, Cave/Troll, Factory/Catapult, Mountaintop Cave/Dragon, Workshop/Ram, Alchemist Shop/Bomber, Iron Works/Cannon, Blacksmith/gear upgrade, Hall of Fame/renown, Pit to Hell/Infernal, Gateway to Heaven/capstone.

## Architecture

- `index.html`: semantic capital and battlefield views, accessible controls, inline SVG symbols for distinct building/unit crests.
- `styles.css`: named dusk-ink, parchment, ember, cobalt, moss, and brass tokens; responsive capital/tree/battle layout.
- `game.js`: deterministic state machine. Versioned local state owns crowns, renown, day, buildings, doctrine roster, and battle. Building income and upkeep create a meaningful capital trade-off. Each battle turn resolves player action, enemy pressure, and victory/defeat. Command boost protects the next tick; volley trades crowns for keep damage.
- `manifest.webmanifest`, `sw.js`: installable offline shell, cache-first static assets.

```text
capital income + buildings -> prerequisite combinations -> doctrine roster
          ^                                              |
          |                                              v
 victory reward / save <- retreat <- deterministic battle turns -> enemy pressure
```

## Verification contract

1. Freshness: `git log` has only the new repo's history and contains no preserved commit; local source is structurally distinct from the old 5-building/4-node implementation.
2. Capital/economy: browser trace buys Barracks, Fletchery, and Stables; resource display changes; interval income/upkeep is visible; localStorage contains version 2 state.
3. Class tree: browser assertions observe locked combinations, then unlock Scout/Archer/Cavalry after required building purchases; rendered tree contains all 12 doctrines and all 15 family names.
4. Battle: browser trace enters battle, deploys units, uses Command boost and Keep volley, observes turn/enemy/player state, and reaches both victory and defeat using deterministic fixture interactions.
5. Art/design: source and rendered screenshots show inline SVG crests with multiple colors, responsive layout, focusable controls, and reduced-motion behavior.
6. PWA/offline: localhost responses for manifest and service worker; cache keys include shell; offline reload serves `index.html`.
7. Save/fullscreen: reload preserves version 2 capital state; fullscreen click records resolved or explicit unsupported result.
8. Quality/delivery: console has zero page errors; 375px and desktop layouts render; the new commit is pushed to remote main through the gated lane and the live deployment id/head are independently checked.

## Risks and mitigations

- Historical images are not all recoverable in this worktree: use the recorded family inventory and only available references, state the limitation rather than inventing images.
- Service workers require HTTP: verify through localhost, not `file://`.
- Browser fullscreen can be denied in automation: record the API result, not a prose claim.
- GitHub/Vercel credentials may be unavailable: retain raw command evidence and block delivery rather than claiming it.

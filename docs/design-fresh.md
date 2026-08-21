# Cinderwatch fresh-build contract

This is a new implementation for the Kingdom Battles restart. It does not import code or history from the preserved `bb3c749` build.

## Product direction

A touch-first heraldic strategy game: spend capital income on a building family, unlock a doctrine only when its building combination is complete, then commit that economy to a short keep-pressure battle. The pencil reference inventory maps to 15 buildings and 12 playable doctrine families: Barracks/Scout, Fletchery/Archer, Mansion/Boss, Stables/Cavalry, Mage Tower/Wizard, Cave/Troll, Factory/Catapult, Mountaintop Cave/Dragon, Workshop/Ram, Alchemist Shop/Bomber, Iron Works/Cannon, Blacksmith/gear upgrade, Hall of Fame/renown, Pit to Hell/Infernal, Gateway to Heaven/capstone.

## Architecture

- `index.html`: semantic capital and battlefield views, accessible controls, inline SVG symbols for distinct building/unit crests, and the `BUILD 3` identity marker.
- `styles.css`: named dusk-ink, parchment, ember, cobalt, moss, and brass tokens; responsive capital/tree/battle layout.
- `game.js`: deterministic state machine. Versioned local state owns crowns, renown, day, buildings, doctrine roster, and battle. Building income and upkeep create a meaningful capital trade-off. Each battle turn resolves player action, enemy pressure, and victory/defeat. Command boost protects the next tick; volley trades crowns for keep damage.
- `manifest.webmanifest`, `sw.js`: installable offline shell, cache-first static assets.

```text
capital income + buildings -> prerequisite combinations -> doctrine roster
          ^                                              |
          |                                              v
 victory reward / save <- retreat <- deterministic battle turns -> enemy pressure
```

## Reference and freshness record

- The restart path is `fresh-kingdom-battles/`, an independently initialized repository directory. Its history contains only the fresh-build commits `a3e8e7c` and `affc690`; the rejected runtime commit `bb3c749` is not an ancestor and no source file is copied from it.
- The available drawing-derived reference is represented by the recorded 15-family inventory below. Each reference has a visible application: the building card, prerequisite node, inline SVG crest, and its matching doctrine or capital-system behavior. No unavailable image is silently presented as recovered.
- The browser QA manifest must bind one identity marker (`BUILD 3`), the pushed remote head, the Vercel deployment id, and the live URL before delivery is called complete.

## Verification contract

1. Freshness: verify `git log --all --oneline`, `git merge-base --is-ancestor bb3c749 HEAD` failure, and the absence of preserved runtime identifiers in the fresh source. Record the empty-path/independent-history check before any delivery.
2. Capital/economy: browser trace buys Barracks, Fletchery, and Stables; resource display changes; interval income/upkeep is visible; localStorage contains version 3 state.
3. Class tree: browser assertions observe all 12 doctrines and all 15 family names. For every doctrine, its full `requires` array must be visible in the locked hint and unlocking must occur only after every required family is owned.
4. Battle: browser trace enters battle, deploys units, uses Focus lane, Rally, and Keep volley, observes visible turn/enemy/player state and unit markers, and reaches both victory and defeat with the deterministic fixture interactions.
5. Art/design: source and rendered screenshots show distinct inline SVG crests for all 15 building families and 12 doctrines, multiple colors, responsive layout, focusable controls, and reduced-motion behavior.
6. PWA/offline: localhost responses for manifest and service worker; cache keys include all shell assets; offline reload serves `index.html` and the service worker cache version is `cinderwatch-v3`.
7. Save/fullscreen: reload preserves version 3 capital state; fullscreen click records resolved or explicit unsupported result; install control handles both browser prompt and fallback instructions.
8. Quality/delivery: console has zero page errors; 375px and desktop layouts render; the delivery manifest binds the new remote `main` head, deployment id, embedded `BUILD 3` marker, and live URL, all independently checked.

## Complete family/prerequisite matrix

| Family | Building prerequisites | Doctrine / behavior unlocked |
| --- | --- | --- |
| Barracks | — | Scout; infantry foundation |
| Fletchery | Barracks | Archer; ranged income |
| Mansion | Barracks | Boss; crown income |
| Stables | Barracks | Cavalry; mobility |
| Mage Tower | Fletchery | Wizard; ranged power |
| Cave | Mansion | Troll; heavy front |
| Factory | Mansion + Stables | Catapult; keep pressure |
| Mountaintop Cave | Mage Tower + Cave | Dragon; aerial capstone |
| Workshop | Barracks | Ram; siege opening |
| Alchemist Shop | Fletchery + Workshop | Bomber; explosive pressure |
| Iron Works | Factory | Cannon; late-line anchor |
| Blacksmith | Stables + Workshop | +5 deployed power |
| Hall of Fame | Mansion + Blacksmith | +15 renown and Boss income |
| Pit to Hell | Cave + Alchemist Shop | Infernal; decisive damage |
| Gateway to Heaven | Mountaintop Cave + Hall of Fame | capstone/legend route |

## Battle fixture

The battle starts at 100 enemy keep / 100 player keep. Every action increments `turn`, applies player damage, then applies deterministic enemy pressure `max(2, 8 + floor(turn / 2) - min(4, deployed units))`; Rally stores 7 absorption for the next pressure tick. A short fixture can prove victory by buying Barracks, deploying Scout repeatedly, and using Volley; defeat can be proved by entering with one Scout and allowing pressure to resolve until the player keep reaches zero. These state changes are visible in the battlefield header, toast, keep markers, and unit lane.

## Delivery manifest

Before claiming delivery, record a JSON or markdown manifest containing: `repo=RedHorizonGroup/kingdom-battles`, `branch=main`, `remote_head=<sha>`, `embedded_marker=BUILD 3`, `deployment_id=<vercel id>`, and `live_url=<url>`. The live browser must assert both the marker and the served behavior; a remote head or URL without the deployment id is insufficient.

## Risks and mitigations

- Historical images are not all recoverable in this worktree: use the recorded family inventory and only available references, state the limitation rather than inventing images.
- Service workers require HTTP: verify through localhost, not `file://`.
- Browser fullscreen can be denied in automation: record the API result, not a prose claim.
- GitHub/Vercel credentials may be unavailable: retain raw command evidence and block delivery rather than claiming it.
- A fresh build must not be mislabeled as complete until the live manifest proves that the deployed head is this build.

## Risks and mitigations

- Historical images are not all recoverable in this worktree: use the recorded family inventory and only available references, state the limitation rather than inventing images.
- Service workers require HTTP: verify through localhost, not `file://`.
- Browser fullscreen can be denied in automation: record the API result, not a prose claim.
- GitHub/Vercel credentials may be unavailable: retain raw command evidence and block delivery rather than claiming it.

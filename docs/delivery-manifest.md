# Kingdom Battles delivery manifest (2026-08-21)

```yaml
repo: RedHorizonGroup/kingdom-battles
branch: main
remote_head: df53d9348df59500890b3d2832167f353320b1af
embedded_marker: BUILD 3
live_url: https://kingdom-battles.vercel.app/
deployment_id: UNVERIFIED
status: blocked-live-deployment
```

## Evidence

- The gated push reported `pushed: true` and head `df53d9348df59500890b3d2832167f353320b1af`.
- `git fetch origin main && git rev-parse origin/main` returned the same head.
- Local browser QA loaded the `BUILD 3` Cinderwatch app, completed capital purchase/recruitment/deployment, verified version-3 local save state, rendered all 15 families and 12 doctrines, and produced zero page errors after the favicon fix.
- The public URL returned HTTP 200, but its served HTML/assets still identify the older build: `game.js` and `sw.js` report `kingdom-battles-cinderwatch-v2`, and the HTML does not contain `BUILD 3`.
- No deployment id was available from the public response. `x-vercel-id` is a request/cache identifier, not a verified deployment artifact.

The remote delivery is verified. Live delivery is not claimed until a Vercel deployment id can be obtained and tied to `df53d9348df59500890b3d2832167f353320b1af`, then the live browser can assert `BUILD 3`.

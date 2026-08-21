# Kingdom Battles delivery manifest

Complete this manifest only after the gated push and live browser verification.

```yaml
repo: RedHorizonGroup/kingdom-battles
branch: main
remote_head: <pushed-main-sha>
embedded_marker: BUILD 3
deployment_id: <vercel-deployment-id>
live_url: <verified-live-url>
```

Required checks:

- The pushed `main` head is the `remote_head` above.
- The live deployment id resolves to that same head.
- The live page visibly contains `BUILD 3`.
- The live browser can complete the capital and battle traces described in `docs/design-fresh.md`.
- No delivery claim is valid with only a branch, URL, or commit and no deployment id.

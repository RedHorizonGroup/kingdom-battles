# Kingdom Battles

Fresh start-from-scratch implementation for the Kingdom Battles brief. This directory is intentionally independent from the preserved historical build at commit `bb3c749`.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173`. The game has no server or account dependency; campaign state is stored in localStorage and the shell is cached by the service worker.

# MOMEY PLAYABLE A5

Static three-player same-room prototype at `/playable-a5/`.

## Roles

- Command: timeline tool, team verification authorization, final execution, shared consequence.
- Rescue: signal tool and verification A.
- Safety: pressure tool and verification B.

All facts may be shared. Humans coordinate independent phones verbally. There is no backend, account, analytics, payment, or fake synchronization.

## Local checks

```powershell
node --check playable-a5\assets\app.js
node --test playable-a5\tests\contract.test.mjs
```

Rendered smoke requires `MOMEY_A5_PLAYWRIGHT_MODULE`, `MOMEY_A5_BASE_URL`, and a Chromium executable path.


# MOMEY PLAYABLE A8 — CODEX HANDOFF

## Current milestone

A8 is an isolated synchronized three-player incident game built on the A7 story foundation. The local implementation, automated QA, Cloudflare deployment, and remote six-client contract pass as of 2026-08-13. GitHub Pages and the external review-package metadata are verified by the Sol main thread after this handoff update.

## Runtime

- Frontend: `playable-a8/`
- Room service: `worker-a8/`
- Room model: one SQLite-backed `A8Room` Durable Object per six-character code
- Transport: WebSocket Hibernation API
- Room lifetime: two hours of inactivity
- Production service name: `momey-playable-a8-room`
- Production service URL: `https://momey-playable-a8-room.momey-micro-mystery.workers.dev`
- Cloudflare version: `b75f82eb-9b13-4135-a6cc-513d418c850f`
- Runtime commit: `e4710fb50ca80b98d9b01b0d48c468c7d3d2877d`
- Intended frontend: `https://kafidog.github.io/momey-micro-mystery/playable-a8/`

## Game flow

`LOBBY → INTRO_1…8 → ROUND1_ACTION/DISCUSS → ROUND2_ACTION/DISCUSS → ROUND3_ACTION/DISCUSS → FINAL_VOTE → ENDING`

All three roles perform one role-specific action in every round. Earlier actions alter later options, the four shared tracks, and the bounded ending selected from the fixed room profile plus the unanimous final action.

## Verification

Run from `worker-a8/`:

```powershell
npm test
```

This includes pure engine tests, all-eight-ending legal reachability, room-code entropy/collision checks, Worker contracts, protected-scope checks, real local Wrangler with two rooms and six WebSocket clients, and Chrome-driven three-context frontend/audio/mobile E2E.

The same six-client room contract also passed against the deployed Worker with production Origin/CORS, two remote rooms, audio-master reassignment, token reconnect, occupied-role rejection, a complete three-round path to `ENDING`, and cross-room isolation.

## Safety boundaries

- Do not modify A1–A7, the root experience, Same-Room pages/assets, the existing evidence-counter Worker/D1, GA4, or acquisition systems.
- Do not treat synthetic structural review as human fun evidence.
- Do not add accounts, payments, analytics, matchmaking, chat, or a generic game engine.
- Keep the current Kokoro `zm_010` static voice chain and canonical dialogue manifest unless the owner explicitly authorizes another voice change.

## Next safe action

Verify the GitHub Pages frontend against the deployed Worker, then create the external A8 review pack with the final head, live URL, screenshot evidence, and ZIP integrity values.

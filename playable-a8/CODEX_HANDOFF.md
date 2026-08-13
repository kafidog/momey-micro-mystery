# MOMEY PLAYABLE A8 — CODEX HANDOFF

## Current milestone

A8 is an isolated synchronized three-player incident game built on the A7 story foundation. The local implementation and automated QA pass as of 2026-08-13; remote deployment and review-package metadata are completed by the Sol main thread after this pre-deployment handoff is written.

## Runtime

- Frontend: `playable-a8/`
- Room service: `worker-a8/`
- Room model: one SQLite-backed `A8Room` Durable Object per six-character code
- Transport: WebSocket Hibernation API
- Room lifetime: two hours of inactivity
- Production service name: `momey-playable-a8-room`
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

## Safety boundaries

- Do not modify A1–A7, the root experience, Same-Room pages/assets, the existing evidence-counter Worker/D1, GA4, or acquisition systems.
- Do not treat synthetic structural review as human fun evidence.
- Do not add accounts, payments, analytics, matchmaking, chat, or a generic game engine.
- Keep the current Kokoro `zm_010` static voice chain and canonical dialogue manifest unless the owner explicitly authorizes another voice change.

## Next safe action

Verify the isolated production Worker and GitHub Pages deployment, then update this handoff and the external A8 review pack with the actual commit, URL, deployment status, and ZIP integrity values.

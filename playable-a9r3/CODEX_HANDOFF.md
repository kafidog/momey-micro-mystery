# CODEX HANDOFF — MOMEY PLAYABLE A9R3

## Current goal

Complete the isolated A9R3 human-dependency pass: keep A9R2's story, event-driven pacing, controls, realtime authority, voice, and causal recap while removing global teammate-readiness leakage and making coordinated callouts materially more robust than local-only silent play.

## Phase and status

- Phase: final internal milestone delivery.
- Engineering and production status: PASS.
- Final runtime commit: `cbb67eb1776a63cdb0e93b5bf4a6cd643f4d4f93`.
- Deployment: GitHub Pages + isolated A9R3 Worker verified; review-package verification follows this source checkpoint.

## Completed

- Verified `HEAD_BEFORE = c5930a8e30ed8e5ea5ca34168f6288af63770975` and healthy deployed A9R2 Pages/Worker.
- Reproduced an A9R2 `COORDINATED_CLOSE` counterexample using only per-role `projectRoomState()` decisions.
- Removed common trolley, pressure, power, milestone, and final-readiness mirrors.
- Added strict role-local projection ownership and routed local/system events.
- Replaced reversible global checkmarks with a static common objective plus owner-local live status.
- Kept the final lever physically available; early pulls rebound, add strain, and cool down.
- Added one fixed-at-room-creation three-timing pressure-wave family after boundary-only testing still produced 152/200 silent best outcomes.
- Final 200-run matching policy result: A9R2 silent 130/200; A9R3 silent 66/200; A9R3 coordinated 177/200; delta +55.5 percentage points.
- Six Council scenarios passed, including no speech, late Rescue/Safety callouts, early Operations pull, and first-time coordinated play.
- Local two-room/six-client realtime, reconnect, cross-room isolation, and projection-leak checks passed.
- Local rendered three-device 390x844 / 412x915 flow passed with `COORDINATED_CLOSE`, no horizontal overflow, operator voice, and missing-audio fallback.
- Isolated Worker deployed as `momey-playable-a9r3-room`; health reports schema `momey-a9r3-room-v1` and status `ok`.
- GitHub Pages deployment run `31768472600` passed for the final runtime commit.
- Production JavaScript/CSS hashes match the committed source exactly.
- Final-runtime production three-device room `Q5VVRH` passed all six briefing beats, three training links, three live cross-phone links, projection-leak checks, mobile flow, phase-transition viewport reset, audio fallback, and `COORDINATED_CLOSE`; 18 screenshots were captured.

## Important files

- `playable-a9r3/assets/app.js`
- `playable-a9r3/assets/styles.css`
- `worker-a9r3/src/engine.js`
- `worker-a9r3/src/index.js`
- `worker-a9r3/tests/human-dependency.test.mjs`
- `worker-a9r3/tests/engine.test.mjs`
- `worker-a9r3/tests/a9r-council-runs.test.mjs`
- `worker-a9r3/tests/local-wrangler.integration.mjs`

## Verified commands

- `npm run test:engine` — 17/17.
- `npm run test:human` — 2/2, 600 aggregate policy sessions plus the explicit counterexample.
- `npm run test:council` — 6/6.
- `npm run test:structural` — 5/5.
- `npm run test:regression` — 3/3.
- `npm run test:worker` — 4/4.
- `npm run test:scope` — 1/1.
- `npm run test:local` — PASS, two rooms/six clients/reconnect/cross-room isolation.
- `npm run test:frontend` — PASS locally and in production, three mobile contexts; the production evidence set contains 18 screenshots.

## Boundaries

Only `playable-a9r3/**` and `worker-a9r3/**` belong to this milestone. Root Micro-Mystery, `playable-a1` through `playable-a9r2`, previous Workers/Durable Objects, `sr-*`, evidence counter/D1, GA4, and acquisition remain protected.

## Current risk

- Actual human fun, conversation quality, first-run duration, social dominance, replay desire, WTP, and commercial demand remain unknown.
- Operations still owns power and the final lever; removing digital teammate readiness improves information dominance, but real social dominance requires human playtests.
- Human-device testing remains outside this internal milestone; no synthetic result is reported as evidence of actual human fun or conversation quality.

## Next safest task

Return the verified review pack to Sol Chairman + Five-Seat Momey Council. The next authorized evidence layer, if requested later, is a real three-human first-run test; do not start A10, acquisition, payment, accounts, or public promotion from this handoff.

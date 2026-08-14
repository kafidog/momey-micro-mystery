# CODEX HANDOFF — MOMEY PLAYABLE A9R3

## Current goal

Complete the isolated A9R3 human-dependency pass: keep A9R2's story, event-driven pacing, controls, realtime authority, voice, and causal recap while removing global teammate-readiness leakage and making coordinated callouts materially more robust than local-only silent play.

## Phase and status

- Phase: development / adversarial QA.
- Local engineering status: PASS.
- Deployment and final review-package status: pending at this checkpoint.

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
- `npm run test:frontend` — PASS, three mobile contexts, 16 screenshots at this checkpoint.

## Boundaries

Only `playable-a9r3/**` and `worker-a9r3/**` belong to this milestone. Root Micro-Mystery, `playable-a1` through `playable-a9r2`, previous Workers/Durable Objects, `sr-*`, evidence counter/D1, GA4, and acquisition remain protected.

## Current risk

- Actual human fun, conversation quality, first-run duration, social dominance, replay desire, WTP, and commercial demand remain unknown.
- Operations still owns power and the final lever; removing digital teammate readiness improves information dominance, but real social dominance requires human playtests.
- Production deployment and package/source hash verification remain to be completed.

## Next safest task

Run the complete local suite from the final source, independently inspect the important Diff and rendered role-local screens, then commit/deploy the isolated Worker and Pages path, run production three-device/reconnect checks, and create the verified Desktop review ZIP.

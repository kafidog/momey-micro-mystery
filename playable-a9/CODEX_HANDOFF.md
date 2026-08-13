# MOMEY PLAYABLE A9 — CODEX HANDOFF

Date: 2026-08-13 (Asia/Taipei)

## Current milestone

A9 implements one fixed 海岬防洪站 incident as a three-phone live cooperative control system. The active middle is not a text-card loop. Window 1 and Window 2 both preserve state into the 45-second final coordination window.

## Architecture

- `playable-a9/`: mobile static client, canonical dialogue, frozen Kokoro audio, Playwright three-device QA.
- `worker-a9/`: isolated Worker and SQLite Durable Object `A9Room`.
- Server formulas advance from timestamps in one-second bounded steps; clients never compute an authoritative outcome.
- WebSocket commands include role token, phase, version and command ID. Successful commands receive an explicit ACK. Stale live intents may be retried once by the current UI state; queued STOP takes priority over replaying START.
- Disconnect immediately releases Rescue advance, Safety brace, or Operations close to neutral.

## Verified behaviors

- Four immediate cross-phone causal links.
- Two live operation windows plus final hold coordination.
- 12 engine tests, 5 structural suites, Worker contract tests, scope test, local 3+3 WebSocket integration, and a full three-mobile-browser run.
- Four complete Council-perspective simulations and three meaningful counterfactual pairs per role.
- Silent local-only policy materially underperforms coordinated play.
- 390×844 and 412×915 portrait layouts have no horizontal overflow.
- Kokoro `zm_010` manifest reports all ten MP3 assets READY.

## Protected scope

Only `playable-a9/**` and `worker-a9/**` are part of this milestone. A1–A8, root Micro-Mystery, `sr-*`, the existing evidence Worker/D1, GA4 and acquisition systems remain protected.

## Remaining evidence boundary

Internal evidence establishes structural coordination, deterministic role influence, technical realtime correctness and control clarity. It does not establish actual human fun, willingness to pay, replay desire or commercial demand. Do not promote A9 or start acquisition before Council review.

## Safe next task

After this milestone is reviewed, the safest next task is an owner-authorized, same-room human playtest protocol using the existing unadvertised A9 URL. Do not add content profiles or platform scope merely for polish.

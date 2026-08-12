# Codex Handoff

## Current milestone

MOMEY PLAYABLE A7 comprehension repair. Runtime, tests, selective `zm_010` audio, screenshots, and review documents are implemented under `playable-a7/**`.

## Protected boundaries

Do not modify A6R, root Micro-Mystery, `sr-h1`, `sr-h2`, `sr-h3`, `sr-assets`, Cloudflare Worker, D1, GA4, Threads, acquisition pages, payment, or account systems as part of A7.

## Required verification

- `node --test playable-a7/tests/contract.test.mjs`
- Set `MOMEY_A7_PLAYWRIGHT_MODULE` to the bundled Playwright `index.js`, then run `node playable-a7/tests/render-smoke.cjs`.
- Confirm public `/playable-a7/` has eight sequential beats, all audio returns 200, and no console errors.

## Evidence boundary

A6R feedback is real human first-run evidence. A7 validation is synthetic until a new three-person human run is actually performed. Do not broaden the claim.

## Next safest task after PASS

Stop and return the complete milestone to Sol Chairman + Five-Seat Momey Council. Do not begin A8, Threads, 2P, 4P, commercial Game01, backend, analytics, accounts, or payment without a new explicit goal.

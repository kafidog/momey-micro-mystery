# MOMEY PLAYABLE A6R

A6R is the isolated first-run correction for Playable A6.

## Run locally

Serve the repository root with a static server and open:

    /playable-a6r/index.html

Role pages are role-1.html, role-2.html, and role-3.html. A shared URL seed is retained in each role URL; players do not need to understand it.

## Verify

    node --check playable-a6r/assets/app.js
    node --test playable-a6r/tests/contract.test.mjs
    node playable-a6r/tests/render-smoke.cjs

The rendered smoke expects a local Chromium/Playwright setup. The runtime includes 22 pre-generated `zm_010` MP3 clips. Captions remain visible, and a missing or failed audio request falls back to 「音訊暫時無法播放，請看字幕」 without blocking progression.

## Status

Implementation and synthetic QA are bounded to `playable-a6r/**` and pass. The owner accepted `zm_010` for temporary use on 2026-08-12. Deployment and package evidence are recorded in the final delivery copy of `17_AGENT_EXECUTION_RECORD.md`.

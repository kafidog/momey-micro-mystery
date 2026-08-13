# CODEX HANDOFF — MOMEY PLAYABLE A9R

Date: 2026-08-14 (Asia/Taipei)

## Implemented

- Isolated `/playable-a9r/` client and `worker-a9r/` room service.
- Exactly six shared, ordered briefing beats with fixed captions and pre-generated Kokoro `zm_010` audio.
- Player-visible content answers who Lin Rui and Gao Cheng are, where they are, why each is at risk, what the central isolation gate separates, and why early/late closure both cost something.
- Exactly three authoritative training links: Operations → Rescue test power, Rescue → Safety test load, Safety → Operations test support.
- Training cannot fail, has no timer, and does not consume power or alter live pressure, exposure, damage, position, or outcome state.
- After the training-complete operator line, Window 1 starts from A9's exact initial metrics.
- Live voice cards collapse to a one-line accessible strip with Replay; optional role copy lives under `查看本席說明`.
- A9 live formulas, clocks, controls, projections, persistence, outcomes, disconnect-safe neutral behavior, and stale/future validation remain regression-equal for representative complete traces.

## Verification completed before deployment

- Engine: 12 tests pass.
- Briefing/training plus A9 core equivalence: 2 tests pass.
- Structural simulations: 5 tests pass, including silent local-only attack and 9 role counterfactuals.
- A9R requested Council runs: 4 tests pass with `COORDINATED_CLOSE`, `BOTH_EXPOSED`, `LIN_STRANDED`, `BOTH_EXPOSED`.
- Worker source: 4 tests pass.
- Protected-scope: 1 test passes.
- Local two-room / six-client Worker integration: pass; reconnect, cross-room isolation, 6 briefing beats, 3 training links, and 4 live links observed.
- Local full three-mobile-browser run: pass; 390×844 / 412×915, 16 screenshots, auto-voice, Replay non-advancing, compact operator strip, missing-audio fallback, no horizontal overflow, coordinated outcome.
- Voice manifest: 16/16 READY.

## Protected scope

Only `playable-a9r/**` and `worker-a9r/**` belong to this milestone. Root Micro-Mystery, `playable-a1` through `playable-a9`, existing A9 deployment, `sr-*`, evidence Worker/D1, GA4, and acquisition systems remain unchanged.

## Known risks and evidence limits

- Operations owns scarce power and the final lever. `OPERATIONS_SOCIAL_DOMINANCE = UNKNOWN / STRUCTURAL_RISK`; synthetic runs cannot resolve real-human social authority.
- Browser automation cannot establish human comprehension, fun, replay demand, WTP, commercial demand, or actual first-run duration.
- Three physical phones and real same-room network conditions remain for human playtest after Council approval.

## Deployment

- Status: `PENDING_FINAL_COMMIT_AND_UNADVERTISED_DEPLOYMENT`
- Intended URL: `https://kafidog.github.io/momey-micro-mystery/playable-a9r/`
- Intended Worker: `momey-playable-a9r-room`

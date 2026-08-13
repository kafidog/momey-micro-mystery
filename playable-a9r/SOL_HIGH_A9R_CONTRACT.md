# SOL HIGH — A9R implementation contract

Date: 2026-08-14  
Authority: current `main` at `e43413f2eec70dd233eeec440c83ec6169cde74d`

## Outcome

A9R is a first-run integration pass over A9. It restores shared story comprehension before the live controls, teaches the three devices as one machine, and removes operator narration from competition with the live instrument. It is not a new game loop and it may not alter A9.

## Allowed scope

- `playable-a9r/**`
- `worker-a9r/**`

Everything else is read-only, including `playable-a1` through `playable-a9`, existing Workers/D1, root pages, `sr-*`, and GA4/acquisition files.

## Shared briefing contract

After all three seats are taken, the authoritative room enters `BRIEFING` with exactly six ordered beats. Every device projects the same beat index and caption. Only the audio-master device advances a beat after its pre-generated clip ends or the bounded caption fallback expires. Reconnect restores the current beat; stale, future, duplicate, wrong-master, and wrong-event commands cannot skip or reorder it.

The six beats establish, in order:

1. Lin Rui is stranded on the west rescue rail.
2. Gao Cheng is physically holding the central isolation gate at the contaminated boundary.
3. The gate blocks contamination from crossing into the rest of the station; losing it harms people and the facility.
4. The rescue trolley needs routed power to reach Lin Rui.
5. Routing that power away from the gate raises the load Gao must hold.
6. The three peers must move Lin Rui, protect Gao, and choose a physically safe close window together.

No beat introduces a villain, deception, advice bot, retcon, or hidden random truth. The facility map remains visible. The screen identifies progress as `N / 6` and remains concise at 390×844 and 412×915.

## Cooperative training contract

Training is authoritative, ordered, safe, and cross-phone. It cannot mutate live metrics, consume backup power, add exposure/damage, or start a timer.

1. Operations performs a test route. Rescue immediately sees test rail power arrive.
2. Rescue performs a short test advance. Safety immediately sees a test gate-load change.
3. Safety performs a short test brace. Operations immediately sees test support arrive.

Only the expected role may perform the current step. Each successful action advances shared `trainingStep`; all projections identify whose control is next and show the received effect on the other role. Reconnect restores the step. Completing step 3 resets all training-only signals and starts A9 Window 1 from the exact A9 initial live metrics.

## Live UI compaction contract

In `WINDOW1`, `WINDOW2`, and `FINAL`, the role instrument and timer dominate the viewport. Operator content is a one-line status strip with a replay control after initial playback/fallback. Captions remain text-accessible, audio is optional, and replay never advances state. Major operator transitions remain authored and pre-generated; the operator never gives strategy.

## A9 core invariants

From entry to `WINDOW1`, A9R may add phases and projection fields. From the first live window onward, these must remain equal to A9 for the same legal command/timestamp trace:

- `DURATIONS_MS`, `rates`, materialization formulas, route limits, thresholds, safe-neutral disconnect behavior
- command ownership and bounded intent validation
- cross-phone live projections and coarse/exact information topology
- Window 1 persistence into Window 2 and Final
- all outcome variants and causal result calculation
- room TTL, authoritative clock, reconnect/token rules, stale/future rejection

Automated regression must execute representative live traces through both A9 and A9R and compare phase, deadlines relative to phase start, all metrics, role projections (apart from A9R-only metadata), and outcomes.

## Acceptance

- Exactly 6 synchronized briefing beats; Lin Rui, Gao Cheng, gate function, tradeoff, and shared objective are comprehensible before controls.
- Exactly 3 safe ordered training links, each causing a visible change on a different phone.
- Training has no live cost and starts Window 1 from A9's original metrics.
- At least 4 immediate A9 live cross-phone causal links still pass.
- Two live windows plus final coordination remain reachable.
- Coordinated, silent, mistake/recovery, and retreat-tradeoff simulations still run; silent local-only play materially underperforms the coordinated baseline.
- Operations social dominance is reported as a structural risk, never as human-tested fact.
- Audio-master auto-play, missing-audio fallback, replay, reconnect, 390×844, and 412×915 pass.
- P0 = 0 and core P1 = 0 before Sol High final approval.

## Evidence boundary

Internal tests may establish technical correctness, structural dependency, and first-run information coverage. They cannot establish actual human fun, willingness to pay, replay demand, commercial demand, real human first-run duration, or real human social dominance. Those remain `UNKNOWN`.

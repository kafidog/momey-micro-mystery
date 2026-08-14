# MOMEY PLAYABLE A9R2

A9R2 is a bounded pacing and goal-clarity pass over A9R. It keeps the same three-phone live rescue, story, control ownership, realtime authority, reconnect behavior, deterministic formulas, and outcome families. It changes the first two timers from mandatory waits into maximum deadlines.

## Player-facing changes

- Window 1 completes when the trolley reaches the visible second-marker safety lock while gate pressure remains below critical.
- Window 2 completes when Lin Rui crosses the safety boundary and gate pressure is back within the authored controllable threshold.
- Window 1, Window 2, and Final show a compact shared goal block directly under the phase timer.
- The old silent Window 1 route cap is gone. If pressure blocks the transition, Rescue sees that the trolley is physically stopped at the second-marker safety lock.
- Operations now sees `分流`, with physical tradeoff subcopy, instead of the normatively suggestive `平衡` label.
- The first training actor receives an explicit first-step instruction; every training phone distinguishes my turn, received change, and waiting.
- Six briefing beats retain the same facility map but use beat-specific focus overlays. Audio-master meta copy appears only at the opening beat.
- Outcome presents a four-step causal recap before optional numeric metrics.

## Architecture

- Static client: `playable-a9r2/`
- Isolated Cloudflare Worker: `worker-a9r2/`
- Durable Object class: `A9R2Room`
- Durable Object binding: `ROOM_A9R2`
- Room schema: `momey-a9r2-room-v1`
- Frozen operator voice: Kokoro `zm_010`; all critical content also appears as text

The Worker remains authoritative for seats, phase, time, controls, outcome, early completion, persistence, and reconnect. A client cannot advance a phase locally.

## Local verification

From `worker-a9r2/`:

```powershell
npm test
```

Focused suites cover engine authority, event-driven completion, explicit route lock, six briefing beats, three training links, pre-threshold A9R physics equivalence, five Council scenarios, role counterfactuals, Worker isolation, protected scope, two-room/six-client realtime and reconnect, and a full three-mobile-browser flow at 390×844 and 412×915.

## Evidence boundary

Automated and synthetic evidence establishes pacing behavior, zero post-objective forced waiting, technical cross-phone causality, deterministic outcomes, and mobile presentation. It does not establish actual human fun, real conversation quality, real-human social dominance, replay desire, willingness to pay, commercial demand, or actual human first-run duration.

Deployment and exact commit evidence are recorded in `CODEX_HANDOFF.md`.

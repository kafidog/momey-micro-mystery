# SOL HIGH — A9R2 live pacing and goal-clarity contract

Date: 2026-08-14
Authority: current `main` at `5f34002309edeab5d9afd6c39e45f490cf7dfb2b`

## Outcome

A9R2 is a bounded pacing/goal-clarity pass over A9R, not A10. It keeps A9R's six-beat story, three-phone cooperative training, live control formulas, role-local information, auto voice, compact operator strip, deterministic outcomes, authoritative room/reconnect, and no-card interaction grammar. It removes post-objective forced waiting and makes each phase's shared physical goal visible.

## Allowed scope

- `playable-a9r2/**`
- `worker-a9r2/**`

Everything else is read-only, including root pages, `playable-a1` through `playable-a9r`, all existing Workers/D1, `sr-*`, GA4, and acquisition files.

## Measured A9R baseline

The actual clean A9R engine trace measured:

- Window 1 duration: 70 s; authored objective first satisfied at ~25.009 s; forced wait ~44.991 s.
- Window 2 duration: 60 s; authored objective first satisfied at ~6.004 s; forced wait ~53.996 s.
- Rescue active: 27 s across both windows.
- Safety active: 27 s across both windows.
- Total post-objective forced wait: ~98.987 s.

These are deterministic synthetic measurements, not human timing.

## Event-driven authoritative progression

The existing 70/60/45-second durations remain maximum deadlines. Only the server may advance phases.

### Window 1

Shared goal:

1. `林芮到第二標記` — `trolleyPosition >= 48` / checkpoint 2.
2. `閘門不要進危急` — `gatePressure < 82`.

When both are true, the authoritative engine safely releases trolley/brace/close holds, records `OBJECTIVE_COMPLETE`, enters `INTERLUDE`, and emits the existing short consequence without waiting for the deadline.

At the second marker, Rescue is physically stopped at a visible inspection lock. The projection and control explicitly say the trolley is waiting at the second-marker safety lock; Advance is disabled. If pressure is still critical, Operations/Safety can recover it, after which the server completes the phase. A silent unexplained numeric cap is forbidden.

### Window 2

Shared goal:

1. `林芮越過安全界線` — fixed `linBoundary` threshold (`trolleyPosition >= 82`).
2. `閘門回到可控負載` — `gatePressure <= 76`.

When both are true, the server safely releases holds and enters `FINAL` immediately with the existing final operator event. The 60-second deadline is only the failure/maximum boundary.

### Final

Keep existing outcome-driven closure. The visible shared checklist is:

1. Lin crossed and trolley secured.
2. Brace is in the safe band.
3. Isolation gate close progress completed.

No vote, captain, or client-side phase advance is introduced.

## Live shared-goal and milestone contract

Every live projection includes one compact `phaseGoal` with two items in Window 1/2 and three status items in Final. It exposes authored labels and boolean/status values, not raw formulas. The goal block sits directly below phase/timer and above coarse context.

Major milestones are authoritative and bounded:

- checkpoint 1/2/3;
- pressure enters warning/critical;
- brace enters safe band;
- Lin crosses the boundary;
- final close begins/completes.

Each milestone changes the shared event serial once and may trigger one short CSS pulse. No per-second toast/event spam.

At Window 1 entry, replace stale room-setup text with the immediate phase objective. Window 2 and Final do the same.

## Preserved physics and acceptable differences

These A9R functions/values remain unchanged unless explicitly listed above:

- power rates/draw, pressure, damage, stamina, heat, exposure, close qualification/progress;
- role command ownership and validation;
- exact/coarse information topology;
- disconnect-safe neutral behavior, TTL, tokens, stale/future rejection, room isolation;
- final outcome bands.

Expected A9R2 engine differences are limited to:

- Window 1/2 completion timing;
- explicit second-marker inspection lock;
- shared phase goals/milestones/pacing evidence;
- causal recap fields;
- bounded copy/UI/visual emphasis.

## Copy/visual requirements

- Operations middle mode key remains `balanced` internally but player label becomes `分流`, with physical subcopy. No mode is called safest/best.
- Training distinguishes my turn, received change, and waiting-next-role. Operations first screen says it is the first step; it never waits for a previous phone.
- Cause/effect microcopy explicitly links cut power → Rescue can move, trolley draw → Safety sees load, brace → Operations sees support.
- Keep six briefing beats and the same map, but apply a distinct visual overlay/highlight per beat: station/coast, Lin/west rail, Gao/gate, pressure/shared power, gate/cut route, three controls.
- Audio-master/synchronization meta explanation appears on Beat 1 only; later beats stay in the incident.
- Outcome adds a deterministic 3–4-step causal recap and names the key failure condition without blame; metric role sentences may remain secondary.

## Internal pacing evidence

Tests/simulations—not public analytics—must record per game:

- Window 1, Window 2, Final, and total live seconds;
- Rescue active seconds;
- Safety active seconds;
- Operations meaningful routing/close action count or modeled active seconds;
- seconds forced to wait after the shared objective was complete;
- major milestone/callout count.

Clean-run acceptance: `POST_OBJECTIVE_FORCED_WAIT_SECONDS` is near zero and must be exactly zero in deterministic engine evidence.

## Acceptance

- Window 1 and Window 2 complete early on server-authored objectives; deadlines still end unsuccessful phases.
- No unexplained route cap; visible second-marker lock/disabled control exists if pressure recovery is needed.
- Every live phase shows a compact goal/checklist near the timer.
- `分流` and all three physical tradeoffs are visible.
- First Operations training state is unambiguous and cause/effect copy is correct across phones.
- Six briefing visuals differ contextually and repeated meta copy is removed after Beat 1.
- Major event strip starts with phase objective and reflects bounded useful milestones.
- Outcome includes causal recap for success and failure.
- Five Council runs include clean, rescue-aggressive, safety-conservative, final-mistiming, and first-time-intuitive policies.
- A9R story/training/voice/compact UI/realtime/cross-phone/formulas/outcomes regressions pass.
- Local and production three-device 390×844/412×915, reconnect, room isolation, fallback, and no overflow pass.
- `P0 = 0`, `CORE_P1 = 0` before Sol High approval.

## Evidence boundary

Internal tests may establish deterministic pacing improvement, zero forced post-objective waiting, artifact goal clarity, technical cooperation, and mobile presentation. They cannot establish actual human fun, conversation quality, social dominance, replay desire, WTP, commercial demand, or human first-run duration.

# MOMEY PLAYABLE A9 — SOL HIGH IMPLEMENTATION CONTRACT

Date: 2026-08-13 (Asia/Taipei)

## 1. Milestone thesis

A9 replaces A8's repeated text-card loop with one deterministic same-room incident whose active grammar is:

`SEE → OPERATE → SHOUT → REACT`

The three phones are three parts of one machine. A player owns one concrete control and one exact local signal; teammates receive only the cross-effect and coarse context. All information may be spoken. There is no traitor, deception, speech recognition, captain, or forced phrase.

## 2. Protected and writable scope

Writable:

- `playable-a9/**`
- `worker-a9/**`

Protected:

- root experience
- `playable-a1/**` through `playable-a8/**`
- `worker/**`, `worker-a8/**`
- `sr-h1/**`, `sr-h2/**`, `sr-h3/**`, `sr-assets/**`
- GA4 and acquisition systems

A9 may copy A8 assets or bounded architecture into its own directories. It must not modify the source copy.

## 3. One incident, three peer controls

Use one fixed authored incident profile. Core cooperation quality has priority over content count.

### 現場調度 / Operations

Physical control:

- three-position power-routing switch: `閘門 / 平衡 / 救援軌道`
- final hold-to-close isolation lever

Exact local signal:

- remaining backup power and current allocation

Cannot move the trolley or brace the gate.

### 救援聯絡 / Rescue

Physical control:

- press-and-hold trolley advance; release to stop/cool
- final secure-trolley control after the exact safe boundary is reached

Exact local signals:

- trolley position/checkpoint
- motor temperature
- Lin Rui boundary/contact state

Cannot route power or brace the gate.

### 結構安全 / Safety

Physical control:

- press-and-hold brace; release to recover stamina
- one authored protection/shield deployment in Window 2
- Gao retreat control in final recovery conditions

Exact local signals:

- gate pressure band
- brace strength/stamina
- Gao exposure

Cannot route power or move the trolley.

No role is host, captain, phase owner, or moral authority. Audio master is playback-only.

## 4. Flow

`ENTRY → LOBBY → INTRO → SIMULTANEOUS_ROLE_TRAINING → LIVE_WINDOW_1 → SHORT_AUTHORED_CONSEQUENCE → LIVE_WINDOW_2 → FINAL_COORDINATION_WINDOW → OUTCOME`

Target first run: 10–15 minutes without added reading.

Training is simultaneous and safe. Each role learns by touching its own real control for a few seconds. When all three training flags are complete, the server/operator starts the live event automatically. No repeated three-ready bureaucracy.

## 5. Authoritative live model

Use an isolated Cloudflare Worker plus one SQLite-backed Durable Object per room and WebSocket Hibernation. Reuse only the minimum A8 room/join/reconnect/audio-master ideas.

Server owns:

- room seats and reconnect tokens
- phase and monotonic version
- server timestamps/deadlines
- power allocation and remaining power
- trolley position, movement and heat
- gate pressure/damage
- brace active state/stamina
- Gao exposure/protection/retreat
- checkpoints and Lin Rui boundary/secure state
- final close progress and outcome
- operator event/audio master

Clients send bounded intents. Any held control is represented by START/STOP intents and an authoritative start timestamp. Materialize formulas from timestamps when an intent, alarm, reconnect, or bounded live heartbeat arrives. Do not run a 60 fps server tick. One-second live heartbeats are the upper allowed frequency and only while a live phase is active.

On disconnect, all held controls owned by that seat release to safe neutral. Reconnect receives the current materialized state and cannot overwrite it.

## 6. Live Window 1 — power / movement / stability

Duration target: 65–75 seconds.

- Operations routes power.
- Rescue phone immediately changes powered state and whether trolley advance can operate.
- Rail-heavy allocation improves movement but worsens gate-pressure trend and consumes more power.
- Gate-heavy allocation stabilizes pressure but removes or slows Rescue control.
- Safety braces in recoverable bursts; holding improves gate support but drains stamina, releasing recovers stamina.
- Rescue advances while powered; long high-power movement raises exact motor heat and can cause a recoverable stall.
- Window 1 ends by deadline or authored checkpoint condition. Actual trolley position, remaining power, gate damage, brace condition and Gao exposure persist.

Natural coordination should include asking for power, warning about pressure, reporting a checkpoint, and requesting a switch back. Do not script those lines as required prompts.

## 7. Live Window 2 — surge / reconfiguration

Duration target: 55–70 seconds.

Start from the exact Window 1 state. Do not reset tracks.

- A deterministic water surge increases pressure/exposure rates.
- Rescue continues from the reached checkpoint and sees exact motor/boundary signals.
- Safety may deploy one shield/protection action that immediately changes Rescue/Safety risk and later outcome, then continues brace control.
- Operations continues routing the remaining power and must react to Rescue and Safety callouts.
- At least one Window 2 control availability/rate must be changed by Window 1 performance.

## 8. Final coordination window

Duration target: 35–50 seconds.

This is a coordinated operation, not a vote or card menu.

- Rescue must physically move past the exact safe boundary and secure the trolley.
- Safety must hold the brace in the safe band; it may order Gao to retreat as a recoverable tradeoff.
- Operations must hold the isolation lever long enough to close.
- Close progress accumulates only while the relevant physical conditions are simultaneously true. A failed early attempt is visible and recoverable, but costs pressure/time.
- Operations must not receive every exact Rescue/Safety signal. Rescue knows the exact boundary; Safety knows the exact stable band. Verbal callouts materially improve timing.
- If time expires, outcome follows the actual state; no random punishment or retcon.

## 9. Required immediate cross-phone links

At least these five must exist and be tested:

1. Operations routes rail power → Rescue powered state/control changes immediately.
2. Operations removes gate support → Safety pressure trend/state changes immediately.
3. Safety starts/stops bracing → Operations lever resistance/safe-window feedback changes immediately.
4. Rescue reaches a checkpoint/boundary → Operations and/or Safety projection changes immediately.
5. Operations starts final close → Rescue and Safety phones immediately show the closing load and must react.

The response target is well under one second after server acknowledgement in normal conditions. Do not fake these only with post-round narrative.

## 10. Information architecture

Every live screen contains:

- server-derived countdown
- role name and one-sentence current objective
- one primary instrument/control area
- one exact local high-value signal
- small coarse shared context
- latest major cross-effect with text/icon/shape, not color alone
- short operator caption when present

Do not mirror all exact values to every role. Do not use a global four-track dashboard that solves the game. Do not use tiny type, dense card lists, toast spam, color-only warnings, horizontal scrolling, or accidental page scrolling during held controls.

Minimum touch target: about 48 dp. Body text begins around 16 px equivalent; primary control labels around 18 px. Test 390×844 and 412×915 portrait.

## 11. Operator/audio

Keep 岬衛-7 as narrator, clock and transition announcer only. Use the A7/A8-approved Kokoro `zm_010` static voice chain and one canonical caption/voice source.

Shared voice auto-plays once on the designated audio-master phone after role takeover unlock. All phones show captions. Replay is secondary. Audio failure must never block a phase or control.

Use sparse authored events: live start, 30-second warning, major checkpoint/surge, final window, outcome. Humans should talk more than the operator.

## 12. Outcome and role influence

Use bounded deterministic outcomes from actual state. The outcome must separately account for:

- Lin Rui rescue/secure state
- Gao Cheng protection/retreat/exposure
- gate closure/damage
- remaining power and timing cost

Create at least three meaningful counterfactual pairs per role. Hold profile, teammate behavior and starting live state constant; change only that role's action/timing. Each pair must change a later control, a person's outcome, or final consequence—not only copy.

No major final family may make Rescue, Operations or Safety universally irrelevant.

## 13. Silent-play and solo-puppet attacks

Implement deterministic structural simulations:

- Coordinated policy uses cross-role exact signals/callouts to route, move, brace and close.
- Silent policy sees only each role's own projection and uses no transferred exact signals.
- Silent play may technically progress but must produce materially worse coordination quality or outcome across representative runs.
- A one-brain three-phone puppet has an informational advantage but should be physically harder because controls overlap in time; this difference must be recorded.

Do not hard-code spoken phrases or a fake communication score.

## 14. Required tests

- pure engine transition/formula tests
- all role authorization and stale/future/duplicate/impossible intent rejection
- held-control disconnect neutralization
- server clock/deadline materialization and reconnect preservation
- minimum five cross-phone projection/control tests
- two live windows plus final coordinated close path
- recoverable mistake path
- time-expiry outcome path
- at least three counterfactual pairs per role
- silent-vs-coordinated structural comparison
- two rooms/six clients, cross-room isolation, occupied seat, audio-master reassignment
- three isolated browser contexts with actual hold controls
- touch/pointer behavior, no accidental scroll, mobile 390×844 and 412×915
- no-card-loop DOM audit: majority of mid-game meaningful actions are instruments, not text-card select/confirm
- protected-scope test permitting only `playable-a9/**` and `worker-a9/**`

## 15. Pass gate

P0 = 0 and Core P1 = 0.

Sol High must independently inspect source/diff, run multiple complete three-device sessions, rotate roles across four Council simulations, attack silent play, inspect counterfactual evidence, verify production, and package the actual final state. Synthetic review may establish structure and technical correctness only; it cannot claim human fun, willingness to pay, replay desire, or commercial demand.

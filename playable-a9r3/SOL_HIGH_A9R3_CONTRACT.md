# Sol High A9R3 Implementation Contract

Date: 2026-08-14 (Asia/Taipei)

## Objective

Create an isolated A9R3 human-dependency pass that preserves A9R2 story, event-driven pacing, three live controls, deterministic outcomes, operator voice, reconnect, and mobile clarity while removing shared-state leakage that lets a local-only silent trio reach the best outcome reliably.

## Verified baseline

- Authoritative checkout: `C:\Users\USER\Documents\ChatGPT\設定\momey-micro-mystery`
- `HEAD_BEFORE = c5930a8e30ed8e5ea5ca34168f6288af63770975`
- `main = origin/main = HEAD_BEFORE` after fetch.
- Deployed A9R2 Pages returned HTTP 200.
- Deployed A9R2 Worker health returned `momey-playable-a9r2-room`, schema `momey-a9r2-room-v1`, status `ok`.
- A local-only policy using only each role's `projectRoomState()` reached `COORDINATED_CLOSE` in 98 one-second policy ticks. It used A9R2's shared pressure/trolley proxies and global final readiness checkmarks; it did not inspect hidden metrics for decisions.
- Therefore `A9R2_SILENT_COUNTEREXAMPLE = PASS_REPRODUCED`.

## Assigned worker

`luna_max_worker` is the primary implementation and QA worker. Luna does not have final PASS authority.

## Allowed read scope

- Current repository, especially `playable-a9r2/**`, `worker-a9r2/**`, A9R2 review pack, and this contract.
- Existing tests and deployment configuration needed to preserve protocol behavior.

## Allowed write scope

- `playable-a9r3/**`
- `worker-a9r3/**`

No other path may be changed. The copied `.wrangler/` and `test-output/` directories are ignored local artifacts and must not be used as source of truth or committed.

## Required implementation

1. Rename all isolated runtime/service/schema/package/config identities from A9R2 to A9R3.
2. Common live projection keeps only phase, timer, one static shared objective sentence, truly global system alarm/event, seats/connectivity, operator state, and the current role's own control.
3. Remove common trolley, pressure, backup-power proxies and all common role-readiness booleans/checklists.
4. Operations projection owns exact backup power, route, lever state, and close progress. It must not expose exact/proxy Rescue checkpoint, Lin boundary/secure, exact/proxy brace stable, Safety pressure, or a combined readiness signal.
5. Rescue projection owns exact trolley position/heat/checkpoint, Lin boundary, and secure state. It must not expose gate pressure, brace stamina, or backup power.
6. Safety projection owns exact pressure/trend, brace stamina/safe band, Gao exposure, shield/retreat. It must not expose exact Rescue position/checkpoint/Lin secure or backup power. Physically apparent rail draw may remain coarse.
7. Route irreversible Rescue milestones only to Rescue. Route pressure/brace milestones only to Safety. Route power/lever feedback only to Operations. Global events are limited to authored operator/phase/facility-level events.
8. Replace global reversible checkmarks with role-local live status labels. Irreversible owner-local milestones may use `○` to `✓`.
9. Final common objective is exactly or equivalently: `林芮固定、支撐穩定後，抓住時機關閘。` Operations receives no Lin-ready or Safety-ready boolean.
10. Early close remains possible and costly. Do not hide/disable the lever until hidden conditions pass; an early attempt stalls or regresses and worsens load, with local mechanical feedback to Operations.
11. Preserve W1/W2 event-driven completion, 70/60/45 maximum clocks, W1 route-lock fiction, `分流`, briefing/training, operator auto voice, causal recap, all role controls, reconnect, deterministic outcome rules, and no card loop.
12. No communication confirmation/READY buttons, chat, microphone, speech recognition, new round, new profile, account, payment, analytics, or acquisition.

## Test contract

- Add hard projection-leak tests for every forbidden field/family, including serialized-value/key attacks and common projection checks.
- Add a reproducible A9R2 local-only silent baseline harness and a matching A9R3 policy harness. Policy decisions may consume only role projections plus explicit simulated callout messages in the coordinated policy.
- Run at least 200 jittered sessions per relevant policy class. Record outcome distributions and `SILENT_SUCCESS_RATE`, `COORDINATED_SUCCESS_RATE`, and delta.
- First implement information boundaries without adding a disturbance. If the matching A9R3 local-only policy remains near-optimal, stop and escalate with evidence. Do not add a disturbance without Sol High authorization.
- Add six Council simulations: clean verbal, silent local-only, Rescue late callout, Safety late callout, Operations without confirmation, first-time intuitive coordinated.
- Preserve and update engine, Worker, protected-scope, realtime/reconnect, frontend, and A9R2 behavior regression tests.
- Mobile acceptance at 390x844 and 412x915: local identity, objective, own exact signal, own control, compact operator; no horizontal overflow or teammate-status wall; touch targets remain safe.

## Acceptance

- A9R2 story/pacing/core preserved.
- A9R2 silent counterexample reproducible.
- Operations cannot digitally see both teammate readiness states.
- Role-owned exact signals and milestones are absent from non-owner/common projections.
- Reversible conditions are not global permanent-looking checks.
- Silent local-only best-outcome success drops materially from A9R2 baseline.
- Coordinated callout policy is materially more robust than silent policy.
- No artificial speech form.
- P0 = 0 and core P1 = 0.

## Required Luna report

Return:

- files changed
- design/implementation summary
- exact test commands and counts
- A9R2 silent distribution
- A9R3 silent distribution
- A9R3 coordinated distribution and delta
- six Council outcomes
- mobile/reconnect status
- unresolved defects or escalation request
- explicit statement that no out-of-scope path was changed

Sol High will independently inspect the important Diff, rerun adversarial policies and rendered three-device flows, decide any bounded disturbance escalation, deploy, package, and issue final verdict.

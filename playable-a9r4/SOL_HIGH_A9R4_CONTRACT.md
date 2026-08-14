# SOL HIGH → LUNA MAX — A9R4 IMPLEMENTATION CONTRACT

Date: 2026-08-14
HEAD before milestone: `d0299dc316d7fcb92f5e51804799d9c5c2fcb074`

## Goal

Implement an isolated A9R4 consequence-fidelity and in-world feedback pass. Preserve A9R3 gameplay, formulas, information boundaries, pacing, voice, realtime authority and controls. Make clean, one-rebound and two-rebound successful closures visibly different without scores, ranks or moral judgment.

## Baseline reproduced by Sol High

Using the current A9R3 engine:

- Clean coordinated success: `COORDINATED_CLOSE`, `gateDamage=0`, `closeAttempts=1`.
- One premature pull then recovery: `COORDINATED_CLOSE`, `gateDamage=24`, `closeAttempts=2`.
- Two premature pulls then recovery: `COORDINATED_CLOSE`, `gateDamage=48`, `closeAttempts=3`.
- The four player-facing recap lines are identical across all three runs; only optional technical metrics differ.

`A9R3_COSTLY_SUCCESS_COUNTEREXAMPLE = REPRODUCED`.

## Assigned agent

`luna_max_worker` is the primary implementation and QA worker. Sol High retains final PASS authority.

## Allowed read scope

- Current repository, especially `playable-a9r3/**`, `worker-a9r3/**`.
- A9R3 Desktop review pack.
- This contract and the user's A9R4 goal.

## Allowed write scope

- `playable-a9r4/**`
- `worker-a9r4/**`

No other path may be modified.

## Required implementation

1. Rename A9R3 runtime identities/protocol/schema to isolated A9R4 equivalents.
2. Keep all A9R3 physics formulas and three pressure-wave variants unchanged.
3. Retain bounded authoritative events needed for outcome derivation. Add an explicit bounded rebound/premature-close event or counter if necessary; do not store per-second samples.
4. Build an outcome detail layer that includes:
   - plain Lin Rui status;
   - plain Gao Cheng status;
   - gate closed/open plus intact/damaged/severely damaged condition;
   - recovery-aware causal recap;
   - exactly one truthful contribution line for Operations, Rescue and Safety.
5. Player-visible success at gate damage 0, 24 and approximately 48 must differ without opening technical metrics.
6. Replace `只有本席先看到` with role/instrument source labels such as `電力控制台`, `西側救援回報`, `閘門現場`.
7. Replace the Final Operations meta sentence with concise in-world responsibility language. Do not re-add teammate readiness booleans.
8. Keep outcome mobile hierarchy compact: headline → three people/facility cards → short recovery/causal recap → three peer contributions → optional metrics.
9. Update A9R4 `README.md` and `CODEX_HANDOFF.md` truthfully.

## Required tests

- A9R4 engine/source/protected-scope tests.
- Clean vs 24 vs 48 player-visible differentiation test.
- All three role contributions present and non-invented.
- Meta-language absence test.
- A9R3 projection leak regression.
- A9R3 silent/coordinated 200-run policy regression; coordinated remains materially stronger.
- A9R3 event-driven pacing regression.
- Six Council games:
  G1 clean success;
  G2 one premature pull recovery;
  G3 two premature pulls recovery;
  G4 delayed callout incomplete close;
  G5 Gao retreat strategy;
  G6 first-time intuitive coordinated.
- Local realtime/reconnect/cross-room tests.
- Rendered three-mobile flow at 390×844 / 412×915 with outcome screenshots and no overflow.

## Forbidden

- No A9R3 edits.
- No new gameplay round, control, profile or formula tuning.
- No stars, rank, points, XP, leaderboard, achievement or moral score.
- No accounts, payment, chat, speech recognition, analytics, LLM or generic engine.
- No Threads/acquisition/public promotion.
- No deployment, commit or push by Luna Max.
- Do not revert or overwrite unrelated user/agent changes; you are not alone in the codebase.

## Completion criteria

- `P0=0`, `CORE_P1=0` under the user's A9R4 standard.
- `npm test` passes from `worker-a9r4`.
- Changes stay entirely within the allowed write scope.
- Report changed files, commands, exact 0/24/48 results, six Council outcomes, policy rates, screenshots, unresolved risks and any escalation.

## File ownership

Luna Max owns all A9R4 implementation and test files during this delegated task. Sol High will not edit those files concurrently. Sol High owns final inspection, deployment, packaging and any later bounded corrective takeover.

# SOL HIGH — MOMEY PLAYABLE A8 IMPLEMENTATION CONTRACT

Status: authoritative implementation contract before Luna Max execution.  
Date: 2026-08-13  
HEAD before A8: `0cb2c4ab88d06f2177416240db426a07ea4506ab`

## 1. Frozen boundaries

Allowed writes:

- `playable-a8/**`
- `worker-a8/**`

Forbidden writes:

- root `index.html`, `script.js`, `styles.css`
- `playable-a1/**` through `playable-a7/**`
- `sr-h1/**`, `sr-h2/**`, `sr-h3/**`, `sr-assets/**`
- `worker/**` and its existing D1/evidence-counter configuration
- `.github/**`, GA4, Threads, Portaly, payment, accounts, acquisition pages

No commit, push, Cloudflare deploy, Pages deploy, public promotion or Desktop package belongs to
Luna's implementation assignment. Sol performs those only after independent PASS.

## 2. Product architecture

- Frontend: isolated static route `/playable-a8/` on GitHub Pages.
- Realtime: isolated Worker `momey-playable-a8-room` in `worker-a8/`.
- One SQLite-backed Durable Object `A8Room` per six-character room code.
- Direct Durable Object WebSocket Hibernation API; no PartyServer and no second runtime.
- Two-hour inactivity TTL using a Durable Object alarm.
- Hard-coded title-specific game state; no generic game engine.
- No account, email, matchmaking, profile, chat, payment, analytics, CMS or permanent room library.

## 3. Room and peer contract

- Player entry offers `建立事件` and `加入事件`.
- Room code: six unambiguous uppercase characters from a restricted alphabet; never show UUID/DO ID.
- Three peer roles only:
  1. `現場調度`
  2. `救援聯絡`
  3. `結構安全`
- The first occupied seat defaults to `岬衛-7 播報`; UI must say `只負責播放聲音，不是隊長。`
- Each role receives a random reconnect token stored only in that browser's A8 localStorage.
- Reconnect restores the exact seat, submitted action, current phase and projected private result.
- If audio master disconnects, server reassigns to one connected ready seat; all seats are peers.

## 4. Authoritative phase model

One server room state owns phase and version. Required sequence:

`LOBBY`
→ `INTRO_1` … `INTRO_8`
→ `ROUND1_ACTION`
→ `ROUND1_DISCUSS`
→ `ROUND2_ACTION`
→ `ROUND2_DISCUSS`
→ `ROUND3_ACTION`
→ `ROUND3_DISCUSS`
→ `FINAL_VOTE`
→ `ENDING`

- Lobby begins the incident only when three unique roles are occupied and all three have used the
  explicit `接手角色` gesture.
- Intro preserves A7's guided place, 林芮, 高承, incident, missing confirmation, map, physical
  tradeoff and three-person team sequence.
- Intro progression is operator-owned: audio master reports current operator event complete; an
  audio-ended or bounded fallback timer may send that event completion. No human gameplay leader.
- Each action phase advances only when all three roles have one accepted role-valid action.
- Each discussion phase uses one lightweight per-seat `我準備好了` readiness; 3/3 advances.
- Final phase locks only when all three current votes are the same. Different votes remain editable
  and produce a discussion prompt, not an ending.

## 5. Fixed truth and shared state

Preserve A7's two internal fixed profiles, `BREAKLINE` and `BACKWASH`, selected once at room
creation and never shown as an engine term. Server never retcons the profile.

Expose no raw numbers table. Render only four compact physical tracks:

- `救援進度`: 待命 / 路線就緒 / 救援車前進 / 林芮已上車 / 已通過閘門
- `中央隔離閘`: 臨界 / 吃緊 / 穩定
- `高承防護`: 暴露 / 有遮蔽 / 已後撤
- `備用電力`: 兩份 / 剩一份 / 已用完

Internal integers/flags may exist, but player UI uses the labels above and a simple map/status
surface, never a spreadsheet.

## 6. Three-round meaningful-action contract

Every role acts in all three rounds. Round 1 is information selection; Round 2 is intervention;
Round 3 is a state-dependent last-window responsibility. Each role therefore has three meaningful
role-specific choices before the final team vote.

### Round 1 — 看清狀況

`現場調度` chooses one:

- 查隔離閘的耗電與關閉時間
- 查救援車與外側隊伍要多久

`救援聯絡` chooses one:

- 直接呼叫林芮
- 看西側救援軌道

`結構安全` chooses one:

- 看海水與污染多久到高承
- 看手動撐桿還能撐多久

Selection remains editable until `確認查詢`; secondary label is `返回重選`. Never use
`改選一件事`. Each confirmed result is private to that seat; shared room shows completion only.

### Round 2 — 做出應變

Each Round 1 choice must unlock or replace at least one contextual Round 2 intervention.

`現場調度` interventions must make a real rescue/gate/power tradeoff, such as rail power, gate
reserve, or a short shared pulse with a later overload cost.

`救援聯絡` interventions must use the chosen evidence: guide 林芮, dispatch/hold the trolley, or
preserve route certainty. At least one option changes rescue progress and at least one changes a
later route choice.

`結構安全` interventions must trade gate support against 高承 exposure: re-seat brace, raise a
splash screen, or pull 高承 back. They change gate and/or protection tracks.

UI wording is contextual (`確認這個做法`, `返回重選`), not generic A/B labels.

### Round 3 — 最後窗口

The server emits a profile/state-dependent escalation. Round 2 must change available Round 3
actions for at least two roles.

- `現場調度`: allocate remaining power to trolley or gate; if exhausted, choose which circuit to
  sacrifice for one short pulse, with a stated information/safety cost.
- `救援聯絡`: commit the route unlocked by contact/rail/trolley state, or stop/wait to avoid a blind
  move; choices alter rescue progress and uncertainty.
- `結構安全`: keep 高承 on the mechanism or order a retreat; choices trade gate stability against
  human exposure.

## 7. Earlier-choice and outcome contract

Hard requirements:

- All six Round 1 alternatives alter Round 2 information/options.
- At least two Round 2 actions alter Round 3 availability.
- Power, rescue progress, gate stability and 高承 protection affect the ending.
- Ending is not selected from final vote alone.

Final actions remain physically plain:

- `現在關上中央隔離閘`
- `讓中央隔離閘再開 95 秒`

Outcome engine should produce a bounded 4–8 variant matrix. It must include prior-action reason
lines (`因為你們先前……所以……`) derived from actual state, not moral commentary. No hidden
third best option and no moral score.

## 8. Realtime validation and privacy contract

Server must reject without state mutation:

- duplicate/double action after seat submission
- malformed action or unknown option
- future-phase action
- stale old-phase/version action
- token/seat mismatch
- second player claiming an occupied role
- operator completion from a non-audio-master or wrong event
- expired room access

Projected state sent to a seat may contain that seat's private result, never another seat's private
result. Room code A must never expose room B state. All broadcasts carry monotonically increasing
room version and authoritative phase.

## 9. Operator audio contract

- Canonical dialogue source owns ID, stage, trigger, caption, voice text and audio path.
- Preserve/copy A7's accepted Kokoro `zm_010` assets where the line is unchanged.
- Generate static local audio only for new shared operator lines; no browser TTS.
- `接手角色` is the first explicit gesture and must perform a local audio-unlock attempt.
- After unlock, only the current `岬衛-7 播報` device auto-plays each new shared event once.
- Every device always shows the current caption.
- `重播` is secondary and available on the audio-master device; it never gates progress.
- Audio-ended advances an intro operator event; a bounded caption-safe fallback must prevent a dead
  room if media playback fails.
- Reconnect/refresh must not replay an already acknowledged operator event automatically.

## 10. UI and mobile gate

- Current phase only; no future-round read-ahead.
- One obvious primary CTA per screen.
- Body type starts at 16px-equivalent; primary action at 18px-equivalent.
- Touch targets at least 48px; safe spacing around destructive/reset controls.
- 390×844 and 412×915: no horizontal overflow, no clipped CTA, readable status/map.
- Do not solve overflow by shrinking text.
- Player-facing copy never says submit, sync, WebSocket, Durable Object, state variable or engine.

## 11. Required test surfaces before Luna checkpoint

- Pure game-engine contract tests for all role/phase/action validity and 4–8 outcome variants.
- Local Wrangler Durable Object/WebSocket integration test with three clients and two rooms.
- Duplicate, double-tap, stale/future action, occupied role, slow player, refresh/reconnect and
  cross-room tests.
- Frontend rendered smoke with three independent contexts at 390×844 and 412×915.
- Progressive disclosure, labels, 48px targets, overflow, audio-master-only autoplay attempt and
  replay fallback tests.
- Full representative three-seat run from lobby through ending plus at least one alternate outcome.
- Protected-system hash/diff proof: only `playable-a8/**` and `worker-a8/**` may differ.

Synthetic review proves structure and technical behavior only. It must not claim that A8 is fun for
real humans.

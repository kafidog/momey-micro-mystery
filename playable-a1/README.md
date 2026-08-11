# Momey Playable A1.2

`Momey — Early Playable Prototype` / `Playable A1.2` is a static three-seat same-room playable slice. Three people use one phone each, keep their screens private, and speak the information they receive.

## Start

Open [index.html](index.html) through a static server. Choose one seat per person:

- [Seat 1 — 事件指揮](seat-1.html)
- [Seat 2 — 人員訊號](seat-2.html)
- [Seat 3 — 封鎖風險](seat-3.html)

Each seat progresses independently. Its local key stores only the seat id, stage, Stage 3 gate, Stage 4 verification draft/confirmation, and Stage 5 commitment/confirmation. There is no network call, analytics, account, shared runtime, or backend.

## Play rhythm

`準備 → 私密資訊 → 交換 → 發現 → 限定查證 → 自由共識 → 後果`

Stage 3 first shows only `0 已確認人員`. The group describes the line in its own words, checks the shared-interpretation gate, and then opens the definition. Stage 4 keeps A/B editable as a local draft; the result stays hidden until `三人都確認選同一項了嗎？` is checked and the choice is explicitly confirmed. The confirmed choice locks and reveals one fragment for that seat.

Stage 5 has one short private prompt per seat and a free discussion. The final local commitment is either `立即封鎖` or `延後封鎖`. The fixed P/Q consequence is unchanged from the preceding foundation.

## Internal reset

At the complete end, open **重新開始本席**, then open the explicit reset confirmation. Reset affects only the current seat's local key and clears both Stage 4 verification fields.

## Evidence boundary

The A1.2 contract and browser QA are technical evidence only. They can establish topology, discovery order, state transitions, branch reachability, refresh/reset behavior, copy counts, and responsive layout; they cannot establish fun, comfort, demand, WTP, E3, E4, or product-market fit. `SYNTHETIC_REVIEW != HUMAN_FUN_EVIDENCE`.

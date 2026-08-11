# Momey Playable A1

`Momey — Early Playable Prototype` is an unadvertised, static 3-player same-room testbed. It is not finished, not Game01, and not a commercial release.

## Start

Open [index.html](index.html) from a static server. Three people use the same room, one phone each, with no shared screen, account, app install, props, or facilitator after start. Choose one seat per person:

- [Seat 1 — 事件指揮](seat-1.html)
- [Seat 2 — 人員訊號](seat-2.html)
- [Seat 3 — 封鎖風險](seat-3.html)

The prototype is intentionally local-first. Each seat progresses independently and stores only its own seat id, stage, verification choice, commitment, and confirmation state in a seat-isolated `localStorage` key. There is no network call, analytics, D1, Worker, account, or shared runtime.

## Play rhythm

`準備 → 私密資訊 → 交換 → 重構 → 限定查證 → 三輪口頭共識 → 後果`

Humans carry explanation, interpretation, contradiction, trust, prioritization, uncertainty, and commitment. Phones carry private information, reveal order, local state, verification result, and consequence display.

## Internal reset

At the complete end, open **內部重玩：重置本席進度**, then open the explicit reset confirmation and confirm. Reset affects only the current seat's local key.

## Evidence boundary

The synthetic walkthrough verifies topology, progression, branch reachability, refresh recovery, and mobile layout. `SYNTHETIC_REVIEW != HUMAN_FUN_EVIDENCE`. `ACTUAL_FUN=UNPROVEN`, `MOMEY_SPECIFIC_WTP=NONE`, `E3=NONE`, and `E4=NONE` remain unchanged.

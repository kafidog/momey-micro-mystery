# Playable A1.1 overview

## Identity

- Name: `Momey — Early Playable Prototype` / `Playable A1.1`
- Route: `/playable-a1/`
- Players: 3 real people, same physical room, one phone per player
- Target duration: 10–15 minutes
- Setup: no app, no account, no props, no shared screen
- Product status: unadvertised working design testbed; not finished, Game01, or commercial

## Core promise

Three people hold different pieces of an escalating incident. They must explain what they know, discover what the ambiguous `0 已確認人員` line does and does not say, choose one limited check, and decide whether to protect P's rescue window or Q's downstream safety.

## Implemented path

1. Entry page states the room/device contract and links to three private seat routes.
2. Each seat sees only its own role content in normal DOM.
3. Seven local stages move from setup through private view, exchange, human-led discovery, verification, consensus, and consequence.
4. Stage 3 begins with only `0 已確認人員` and an open question. A local checkbox records that the group has exchanged the first two cards; only then can the status definition be opened and the next stage reached.
5. Q is seeded in multiple private cards before commitment as the real person at the downstream second door. A delay may save P while exposing Q to possible irreversible bodily harm; the fixed ending is permanent respiratory injury and permanent removal from field duty. An immediate seal protects Q while closing P's rescue window.
6. Verification A asks whether the signal is really from P. B asks whether waiting will bring danger to Q. Each seat receives a different short fragment; the unselected option remains credible but unconfirmed.
7. Stage 5 gives each seat a private responsibility, then uses one plain shared-agreement checkbox after free discussion. The final commitment is either `立即封鎖` or `延後封鎖`; consequence, not verification, determines what happens.

## Architecture

- Static HTML pages only.
- Shared generic state engine: `assets/app.js`.
- Shared visual system: `assets/styles.css`.
- Seat-specific facts remain in `seat-1.html`, `seat-2.html`, and `seat-3.html`.
- State is seat-isolated and persists `seat`, `stage`, `recontextConfirmed`, `verification`, `commitment`, and `commitConfirmed` only.
- No React, package, backend, WebSocket, account, database, analytics, collector, D1, Worker, or `sr-assets` dependency.

## Evidence boundary

The A1.1 QA pass is synthetic and technical. It can establish playable topology, discovery order, branch reachability, and responsive behavior, not fun, demand, WTP, E3, E4, or product-market fit. `SYNTHETIC_REVIEW != HUMAN_FUN_EVIDENCE`.

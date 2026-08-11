# Playable A1 overview

## Identity

- Name: `Momey — Early Playable Prototype`
- Route: `/playable-a1/`
- Players: 3 real people, same physical room, one phone per player
- Target duration: 10–15 minutes
- Setup: no app, no account, no props, no shared screen
- Product status: working design testbed; not finished, Game01, or commercial

## Core promise

Three people hold different pieces of an escalating containment incident. They must explain what they know, reinterpret a misleading system state fairly, choose one limited verification, and make a shared decision while a residual uncertainty remains.

## Implemented path

1. Entry page states the device/room contract and links to three private seat routes.
2. Each seat sees only its own role content in normal DOM.
3. Seven local stages move from setup through private view, exchange, recontextualization, verification, verbal consensus, and consequence.
4. Verification A and B each clarify one uncertainty while leaving the other credible but unverified; each seat receives a different fragment that must be spoken aloud.
5. The final commitment is either `立即封鎖` or `延後封鎖`; a three-round oral protocol keeps Seat 1 from silently owning the decision, while the physical consequence remains fixed and not a morality score.
6. Refresh restores the current seat's local stage/choice state; deliberate two-step reset clears only that seat.

## Architecture

- Static HTML pages only.
- Shared generic state engine: `assets/app.js`.
- Shared visual system: `assets/styles.css`.
- Seat-specific facts remain in `seat-1.html`, `seat-2.html`, and `seat-3.html`.
- No React, package, backend, WebSocket, account, database, analytics, collector, D1, Worker, or `sr-assets` dependency.

## Evidence boundary

The first QA pass is synthetic and technical. It can establish playable topology and branch reachability, not fun, demand, WTP, E3, E4, or product-market fit. `SYNTHETIC_REVIEW != HUMAN_FUN_EVIDENCE`.

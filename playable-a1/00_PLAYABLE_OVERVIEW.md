# Playable A1.2 overview

## Identity

- Name: `Momey — Early Playable Prototype` / `Playable A1.2`
- Route: `/playable-a1/`
- Players: 3 people in one physical room, one phone per person
- Target duration: 10–15 minutes
- Setup: no app, account, props, shared screen, or facilitator after start

## Core promise

Three people hold different parts of one escalating incident. They explain their cards, interpret the ambiguous `0 已確認人員` line together, choose one limited check, and decide whether to preserve P's rescue window or Q's downstream safety.

## Implemented path

1. Entry page states the room/device contract and links to three private seat routes.
2. Each seat has the same seven-stage shell and different private facts.
3. S1 owns command/timeline facts and only the pre-commitment Q station reference. S2 owns the P/human signal. S3 owns physical movement, why Q cannot leave, the time window, and the possible human severity.
4. Stage 3 begins with only the neutral status line and task. The definition is created after the shared-interpretation gate and is retained by `recontextConfirmed` across a refresh at that stage.
5. Stage 4 uses `verificationDraft` and `verificationConfirmed`: A/B can be changed before confirmation, result cards are hidden before confirmation, and one confirmed choice locks the local buttons and reveals one seat fragment.
6. Stage 5 uses one short private prompt per seat and free discussion before the existing commitment confirmation.

## Architecture

- Static HTML pages only.
- Shared state engine: `assets/app.js`.
- Shared visual system: `assets/styles.css`.
- Seat-specific facts remain in `seat-1.html`, `seat-2.html`, and `seat-3.html`.
- State is seat-isolated and stores `seat`, `stage`, `recontextConfirmed`, `verificationDraft`, `verificationConfirmed`, `commitment`, and `commitConfirmed` only.
- No React, package, backend, WebSocket, account, database, analytics, collector, D1, Worker, or `sr-assets` dependency.

## Evidence boundary

This pack records a bounded implementation and technical QA pass. It does not claim human playtest feedback, fun, demand, WTP, E3, E4, deployment, commit, or final Sol High approval.

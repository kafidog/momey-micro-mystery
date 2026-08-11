# Limited verification design — A1.2

The group gets exactly one plain-language question. A/B is first a local draft, not a result. The draft can change; the result stays hidden until the group confirmation checkbox and explicit confirm action. After confirmation the choice is locked and only that seat's fragment appears.

## State contract

- `verificationDraft`: `null`, `A`, or `B`; editable while Stage 4 is unconfirmed.
- `verificationConfirmed`: `false` until the explicit confirmation; only then may result cards render.
- Changing the draft from A to B or B to A clears the group-consensus checkbox. The confirm button stays disabled until the group checks it again.
- Refresh before confirmation preserves the draft but not an uncommitted checkbox. Refresh after confirmation preserves the locked choice and revealed fragment.
- Reset removes both fields and returns the seat to Stage 0.
- No network synchronization is implied: a deliberate A/B mismatch across phones remains a human-visible coordination problem, not an auto-resolved vote.

## Option A — P-side question

**核對訊號是否真的來自 P**

- Confirms that the live human signal is linked to P's wearable device and is located in Sector C.
- Makes P's possible presence clearer.
- Does not prove a safe evacuation path, a rescue route, or P's current physical safety.

## Option B — Q-side question

**核對延後會不會讓危險到達 Q**

- Confirms that the same delay window pushes danger toward Q's second-door station.
- Makes Q's physical/human risk clearer.
- Does not announce whether the seeded irreversible harm will happen or make P's presence certain.

## Seat fragments

- S1 owns the timeline/window fragment for A/B.
- S2 owns the P-source and signal-interpretation fragments for A/B.
- S3 owns the location/path and Q-door-risk fragments for A/B.

The unselected question remains credible but unconfirmed. Verification changes the group's explanation, not fixed truth or the consequence map.

## Branch rule

| Verification | Commitment | Fixed consequence |
|---|---|---|
| A | 立即封鎖 | Q leaves safely; P's rescue window closes. |
| A | 延後封鎖 | P is rescued; Q completes the door, suffers permanent respiratory injury, and leaves field duty. |
| B | 立即封鎖 | Q leaves safely; P's rescue window closes. |
| B | 延後封鎖 | P is rescued; Q completes the door, suffers permanent respiratory injury, and leaves field duty. |

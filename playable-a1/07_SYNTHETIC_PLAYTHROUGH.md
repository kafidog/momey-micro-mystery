# Synthetic three-seat walkthrough — A1.2

## Evidence boundary

This is a synthetic technical and conversation-topology review. It does not establish fun, comfort, demand, willingness to pay, E3, E4, or commercial readiness.

`SYNTHETIC_REVIEW != HUMAN_FUN_EVIDENCE`

## Browser method

- Local source served at `http://127.0.0.1:8125/playable-a1/`.
- Seat 1, Seat 2, and Seat 3 used their separate seat-scoped local state keys.
- Sol High independently drove the final branch matrix after Luna Max's implementation and bounded correction.
- Warning/error console logs were read after the completed flows; all were empty.

## Four-branch matrix

| Branch | Seat used | Verification | Commitment | Observed result | Status |
|---|---:|---|---|---|---|
| A+Seal | 1 | A — P signal | 立即封鎖 | Q completed the door and left; P's rescue window closed; P could not be rescued | PASS |
| A+Delay | 2 | A — P signal | 延後封鎖 | P was rescued; Q suffered permanent respiratory injury and permanently left field duty | PASS |
| B+Seal | 3 | B — Q danger | 立即封鎖 | Q completed the door and left; P's rescue window closed; P could not be rescued | PASS |
| B+Delay | 1 | B — Q danger | 延後封鎖 | P was rescued; Q suffered permanent respiratory injury and permanently left field duty | PASS |

The final consequence followed Seal/Delay in all four runs. A/B changed the private interpretation fragment and did not change the fixed outcome.

## Stage 3 neutral-discovery test

Before the gate on Seat 2:

- visible line: `0 已確認人員`
- definition text: empty
- definition container: hidden
- initial Stage 3 HTML contained no `無法報告任何人`, `不等於 Sector C 沒有人`, or `物理真相` answer

After the shared-interpretation gate, the system created:

`0 代表確認服務現在無法報告任何人；它不等於 Sector C 沒有人。`

Refresh at Stage 3 retained the revealed definition. The formal definition was not hidden in the initial HTML.

## Verification draft/change/confirm test

Seat 3 deliberately performed the ordinary mismatch sequence:

1. Select draft A: no result visible; confirm disabled.
2. Check `三人都確認選同一項了嗎？`: confirm enabled; no result visible.
3. Switch draft A to B: A unselected, B selected, checkbox automatically cleared, confirm disabled, no result visible.
4. Check the agreement again and confirm B: both choice buttons locked and exactly one B fragment visible.

Seat 1 also retained draft A across refresh with results hidden. After confirmation, refresh retained the locked A choice and exactly one visible A fragment.

## Stage 5, consequence, and reset

- Each seat displayed one short private prompt.
- No speaking order or three-round checklist was shown.
- Each completed branch required a local choice plus the group-agreement checkbox.
- Reset was tested after completion: the seat returned to Stage 0, the verification-consensus checkbox was false, and no verification result remained visible.

## Mobile matrix

| Viewport | Flow state | Document overflow | Body overflow | Nav overflow | Stage markers | Console | Status |
|---|---|---:|---:|---:|---|---|---|
| 390×844 | Seat 3 complete flow through Stage 6 | 0 | 0 | 0 | 7/7 inside viewport | empty | PASS |
| 412×915 | Seat 3 Stage 6 restored state | 0 | 0 | 0 | 7/7 inside viewport | empty | PASS |

## Every-seat removal test

- `REMOVE_SEAT1_TEST=PASS` — without Seat 1, the table loses P's lawful entry, the unconfirmed-exit timeline, the 07:20–07:23 command window, and command authority. It cannot place either human claim inside an actionable window.
- `REMOVE_SEAT2_TEST=PASS` — without Seat 2, the table loses the credible P-linked human signal and distress continuity. Delay loses its specific human-rescue basis.
- `REMOVE_SEAT3_TEST=PASS` — without Seat 3, the table loses the moving contamination front, why Q cannot leave, the timing toward the second door, and the possible irreversible human harm. The real cost of delay is no longer informed.

Each seat contributes two pre-commitment private units and one distinct fragment under each verification choice.

## Natural-conversation topology

The synthetic roleplay prohibited verbatim card reading. The information naturally produced these paraphrased exchanges:

- Seat 1: P was allowed in, no confirmed exit appeared before the service failed, and the order window ends at 07:23.
- Seat 2: a human signal may be P, but its source and exit path are different questions.
- Seat 3: Q cannot leave before the second door is shut, and waiting moves the contamination front toward that work position.

That topology generated clarification and disagreement about identity, timing, exit, and exposure. It is recorded only as `CONVERSATION_TOPOLOGY=PASS`; it is not a fun score.

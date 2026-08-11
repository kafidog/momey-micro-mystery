# Playable A1.2 screenshot index

The final review pack contains 13 useful screenshots, below the maximum of 16. They were captured from the final local source served at `http://127.0.0.1:8125/playable-a1/`. No decorative duplicates are included.

| # | File | Evidence |
|---:|---|---|
| 1 | `01_entry_page_mobile_412.png` | Simplified entry page at 412×915: 3 players, same room, one phone each, seat selection, privacy rule |
| 2 | `02_seat1_early_private.png` | Seat 1 command/timeline opening card |
| 3 | `03_seat2_early_private.png` | Seat 2 P/human-signal opening card, without Q bodily-risk duplication |
| 4 | `04_seat3_unique_q_risk_mobile_390.png` | Seat 3 at 390×844: Q doing second-door work and the physical movement toward that position |
| 5 | `05_stage3_before_definition.png` | Corrected Stage 3 pre-gate state: `0 已確認人員`, neutral task, no definition |
| 6 | `06_stage3_after_definition.png` | Same Stage 3 after the explicit shared-interpretation gate, with the dynamic definition visible |
| 7 | `07_verification_provisional_A.png` | Draft A selected; result not revealed |
| 8 | `08_verification_confirmed_A.png` | Confirmed A control state; choice locked |
| 9 | `09_verification_confirmed_B.png` | Confirmed B with its private fragment in the full-page capture |
| 10 | `10_final_free_discussion.png` | Stage 5 free discussion and one short Seat 1 prompt |
| 11 | `11_seal_consequence_mobile_390.png` | Seal consequence at 390×844 |
| 12 | `12_delay_consequence.png` | Delay consequence with permanent respiratory injury and permanent field removal |
| 13 | `13_mobile_412_final.png` | Stage 6 at 412×915 with all seven progress markers fitting |

## Capture validation

- `SCREENSHOT_COUNT=13`
- `DECORATIVE_DUPLICATE_COUNT=0`
- `STAGE3_LABEL_MISMATCH_COUNT=0`
- `PII_FINDING_COUNT=0`
- `PUBLICATION_ACTION=NONE`

An initially captured file intended for Stage 3 before-definition evidence was visually found to still show Stage 2. It was rejected and overwritten after a fresh reset and explicit `body.dataset.stage === "3"` check. The packaged file is the corrected Stage 3 image.

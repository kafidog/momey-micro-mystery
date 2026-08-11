# Defect report

## Current bounded revision status

Sol High identified five core P1 defects in the first adversarial review. Luna Max applied bounded corrections under `playable-a1/**`; the required static and fresh-tab browser revalidation now passes. A synthetic pass is not a human-fun pass.

- `P0=0` before and after the bounded implementation work; no private-seat cross-leak, unreachable branch, refresh corruption, or facilitator dependency was introduced.
- `CORE_P1=0 after bounded correction and revalidation; the five Sol findings are retained below as resolved entries.`
- Copy/fidelity changes are limited to the same bounded pass; no unrelated polish was expanded.

## Defects found

| ID | Severity | Area | Evidence | Disposition |
|---|---|---|---|---|
| P1-01 | Core | Limited verification is flavor because early cards stated A/B as settled | Seat 2 now shows provisional human pattern/mapping; Seat 3 now shows provisional pressure/model reliability; result copy states the unselected option remains credible but unverified. | RESOLVED — fresh result routes and status copy verified. |
| P1-02 | Core | Stage 3 introduced no-confirmed-exit as a new fact | Seat 1 Stage 2/U4 now explicitly seeds no confirmed exit/刷出 before the service failure. | RESOLVED — static contract and Stage 2 → Stage 3 route verified. |
| P1-03 | Core/mobile | Stage navigation horizontally scrolled at narrow width and hid nodes | Narrow CSS now fits all seven markers with hidden internal overflow; browser asserted marker bounds and nav scroll width at both required widths. | RESOLVED — 390×844 and 412×915 verified. |
| P1-04 | Core | Verification result cards were nearly identical across seats | A/B result cards now carry seat-specific fragments with distinct `data-fragment-id`, headings, and body copy. | RESOLVED — six distinct fragments verified by static and browser DOM. |
| P1-05 | Core/social | One shared checkbox did not sufficiently guard Seat 1 alpha control | Stage 5 now requires Seat 2 human-loss statement, Seat 3 downstream-cost statement, then Seat 1 neutral restatement before local confirmation. | RESOLVED — revised protocol visible and required before confirmation. |

## Visual mismatch ledger

| ID | Prior mismatch | Revision evidence | Status |
|---|---|---|---|
| V-01 | Narrow stage progress exposed an internal horizontal scrollbar and only four visible nodes. | At 390×844 and 412×915, seven marker rectangles were inside the viewport and `stage-nav.scrollWidth === stage-nav.clientWidth`. | RESOLVED |
| V-02 | UI copy mixed unnecessary English labels with the Traditional Chinese interface. | UI now uses 階段、簡報、封鎖模型、未宣傳測試版、完成品/商業發行; required title and fixed technical terms remain. | RESOLVED |
| V-03 | Protected visual constraints could be weakened by decorative effects. | No gradient/glow/neon tokens; palette/layout/touch/focus/reduced-motion rules remain bounded. | RESOLVED |

## Evidence boundary

No defect ledger entry may be interpreted as actual-fun, demand, WTP, E3, or E4 evidence. `SYNTHETIC_REVIEW != HUMAN_FUN_EVIDENCE`.

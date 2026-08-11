# Synthetic three-seat walkthrough — A1.1

## Method

Each seat is opened in a separate fresh browser tab or isolated context. The walkthrough must check the human-led Stage 3 discovery gate, Q references before commitment, distinct A/B fragments, all four A/B × commitment branches, refresh/reset, isolation, responsive layout, and console health. It does not simulate enjoyment.

`SYNTHETIC_REVIEW != HUMAN_FUN_EVIDENCE`

## Required branches

| Branch | Verification | Commitment | Expected result | Status |
|---|---|---|---|---|
| A | A — P signal | 立即封鎖 | Q leaves safely; P rescue window closes | PASS — Seat 1 fresh UI flow reached Stage 6; console error/warn empty |
| B | A — P signal | 延後封鎖 | P rescued; Q suffers permanent respiratory injury and is permanently removed from field duty | PASS — Seat 1 fresh UI flow reached Stage 6; console error/warn empty |
| C | B — Q danger | 立即封鎖 | Q leaves safely; P rescue window closes | PASS — Seat 1 fresh UI flow reached Stage 6; console error/warn empty |
| D | B — Q danger | 延後封鎖 | P rescued; Q suffers permanent respiratory injury and is permanently removed from field duty | PASS — Seat 1 fresh UI flow reached Stage 6; console error/warn empty |

## Assertions to record

- Stage 3 begins with only `0 已確認人員`; the definition was absent from the visible DOM state before the discussion control and appeared after it.
- Refresh after opening the definition preserved Stage 3 and the confirmed definition; Stage 2/4/5 refresh and Stage 6 reset were also exercised.
- Q appears in at least two meaningful pre-commitment cards; Q is not introduced only by Stage 6.
- A clarifies P's source; B clarifies danger toward Q; neither changes the final consequence mapping.
- Result fragments are different by seat and are short enough to explain in own words.
- Stage 5 has private 人員訊號席／封鎖風險席／事件指揮席 responsibilities and a free-discussion agreement gate, not a three-round compliance list; a capture records the 事件指揮席 responsibility.
- Seat isolation snapshot showed Seat 1 at Stage 6 while Seat 2 and Seat 3 independently remained at Stage 4; reset was performed through the two-step UI only.
- At 390×844 and 412×915, all seven progress markers fit without page or internal horizontal overflow.

## Natural-language roleplay pass

This synthetic roleplay did not recite card text. The prompts naturally produced questions such as: `P 的訊號還能代表什麼？`, `如果等三分鐘，Q 能不能離開第二道門？`, and `我們是相信訊號，還是相信時間窗口？` This is a conversation-topology check, not human-fun evidence.

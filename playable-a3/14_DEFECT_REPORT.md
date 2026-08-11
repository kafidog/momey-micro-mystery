# Defect Report — Final Source State

| Severity | Open count | Evidence |
| --- | ---: | --- |
| P0 | 0 | 11/11 contract、三 isolated context、四分支、refresh/reset、protected diff PASS |
| Core P1 | 0 | Core P1-01 已修正並增加防退步 contract；三工具、compact board、mobile PASS |
| P2+ | 未宣稱全部消除 | 實體三機與真人節奏仍屬後續 human evidence，不是本次內部 blocker |

## Resolved Core P1-01 — 指揮工具提前給出自己的推論

Luna 初版在對齊前就用 timeline note 寫出「t=20 切斷、t=95 完成」，並將兩條 bar 畫成最終相對長度。Sol 判定這會讓操作接近 cosmetic。最終修正：未完成時兩條 bar 都是中性待放置長度、終點說明不標答案、備註只要求放上同一時間軌；兩段都對齊後才顯示相對長度與衝突。contract 明確拒絕舊預揭句。

## QA harness corrections（不是 runtime defects）

- 初版 smoke 的 command／safety assertion 使用與實際證據不同的片語；已改成 runtime 真實 copy。
- assertion failure 時 Chrome 未在 finally 關閉，造成無界等待；已加入 finally cleanup。這解釋 Luna 最終 QA 無回應，沒有把等待本身誤列為遊戲 PASS。

`P0_COUNT = 0`

`CORE_P1_COUNT = 0`

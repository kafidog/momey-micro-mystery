# Full Sharing Stress Test

## 測試假設

三人把自己看見的所有角色 evidence 在最早合理時間全部說出；沒有保留資訊、禁止分享或祕密規則。三個 session 以獨立 storage model 模擬。

## 最終證據

- 角色工具仍必要：沒有時間線對齊，就沒有 t=20／t=95 的互斥；沒有四欄訊號檢視，就沒有可信連結加上即時性／位置邊界；沒有壓力投影，就沒有 t=95 東閘與高承責任的視覺因果。
- full sharing 後兩個未知仍被明示，A/B 仍只能查一端。
- teamReady 後只出 compact 三行，不提供三張完整 evidence 的閱讀捷徑。
- A/B 結果不自動替隊伍按下 final choice；四分支仍由隊伍自己選。

contract test 已檢查 shared renderer 不存在 full evidence map、三個 isolated session 不讀其他 seat key、A/B 需要 draft→confirm。Playwright 以三個隔離 context 操作三席；公開交換後 `.compact-board` 恰有三行、`.shared-evidence-grid` 為 0，A/B 仍各自解開一端而保留另一端未知。結果：`FULL_SHARING_STRESS_TEST = PASS`。

## CONVERSATION_TOPOLOGY

合成角色扮演禁止逐字照念卡片，形成以下交換：指揮先用自己的話指出「20 秒關門會先截斷仍需 95 秒的清線」；救援追問能否確定林芮現在仍活著，救援席回答只能確定裝置與刻意兩點回應，不能確定即時性或位置；安全席補充等滿 95 秒會把壓力推到高承，但撐架能否撐住仍未知。接著出現兩個澄清與一個分歧：查西側是否等於優先林芮、查東閘是否等於放棄她，以及即使查到一端，另一端仍不能補回。最後討論轉成「先查哪個未知」與「已知／未知下要封閉或維持」的代價，而不是互相懷疑或朗讀程序。

記錄：`questions = YES`、`clarifications = YES`、`disagreement = YES`、`tradeoff discussion = YES`。未評分 fun。

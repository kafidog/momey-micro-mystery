# Known Limitations

- A3 是靜態 localStorage 原型；三支實體手機不會同步 seat 或 shared state。teamReady 是同室口頭確認後，各席在自己手機做的本機記錄。
- 本機與 deployment 不是同一證據層級；本 worker 不 deploy、不建立公開 URL，不把本機 smoke 當公開 delivery proof。
- 沒有真實人物、即時感測器或網路來源；角色結果是固定故事真相的互動化呈現。
- 瀏覽器 rendered smoke 只代表實際檢查到的 viewport／context；未檢查的實機、瀏覽器、輔助技術不宣稱通過。
- `13_SOL_HIGH_ADVERSARIAL_REVIEW.md`、P0/Core P1 數字與所有 PASS 語句都要由 Sol High final review 重新判定。

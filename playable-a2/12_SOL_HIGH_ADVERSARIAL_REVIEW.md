# Sol High Adversarial Review（Luna draft）

這是交給 Sol High 的攻擊清單和目前證據，不是最終批准。

| 攻擊問題 | 目前回答 | Source evidence |
| --- | --- | --- |
| 不看作者說明能懂故事嗎？ | 可以；入口 caption 具備地點、正常、事故、人物、危險、接管理由和決定理由 | `index.html`、contract test |
| 圖像和 caption 是否講同一個時刻？ | Core P1 retry 後是；01=18:40 正常、02=18:47 破裂、03=西側災後、04=東閘危險、05=18:48 接手、06=單次查證／立即決定 | `index.html`、`STORYBOARD_INDEX.md`、逐格 contract |
| 三支手機是不是同一時刻？ | 是；所有 role page 都寫同一個 18:48，shared renderer 也固定這個時間 | role HTML、`app.js` |
| 手機會不會錯把同一 storage 的三個 seat 當成三支裝置？ | P0 retry 後不會；每席只檢查目前角色自己的 `actionComplete + teamReady`，沒有遠端完成 count 或 `allActionsComplete()` | `app.js`、三隔離 session contract／rendered QA |
| 公開分享會不會讓遊戲塌掉？ | 不會；三張證據留下人的/路線未知和撐架未知 | `10_FULL_SHARING_STRESS_TEST.md`、Playwright DOM |
| 每個 action 是否必要？ | 是；三段 removal logic 都對應一個不可替代的證據能力 | `05_ROLE_ACTIONS.md`、contract test |
| 查證是否可能偷換真相？ | 不會；A/B 只增加固定 result，四個 consequence branch 共享 fixed truth | `08`、`09`、`app.js` |
| final 是否有正確答案暗示？ | UI 只使用中性選項 1/2 和客觀後果，不使用 moral score | `styles.css`、`app.js` |
| 是否有 P/Q、祕密或「不能說」？ | player source 無這些指示；所有相關資訊明示可公開交換 | `04`、contract test |

## Luna worker assessment

Sol 獨立 review 先後發現 genuine P0 readiness 與 Core P1 comic timeline mismatch；舊的錯誤證據已撤回。Luna retry 現在基於 independent-session gate 證據，以及逐格 filename／heading／time／order contract 暫記：`P0 = 0`、`CORE P1 = 0`。這不是 Sol High 的 final verdict；若 Sol 再發現 source contradiction，應在 `13_DEFECT_REPORT.md` 新增 defect 並回到 code。

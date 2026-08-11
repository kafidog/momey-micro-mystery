# Synthetic Playthrough

## 三支手機流程

1. 三個獨立 session 讀共同六格序章並選擇不同 role。
2. Seat 1 點「遠端封閉」→ t=20、點「救援清線」→ t=95；錯點一次確認溫和修正，完成後重新整理，自己的 evidence 仍在。
3. Seat 2 依序打開裝置簽名、兩點回應、時間邊界、位置／路線；完成後重新整理，自己的 evidence 仍在。
4. Seat 3 先把 marker 推到 40 秒，再推到 95 秒；中間顯示投影而非失敗，完成後重新整理，自己的 evidence 仍在。
5. 三人完整口頭分享，依各席自然問題確認「三個人的結果都已經說完了」。teamReady 後只見 compact 三行。
6. 走 A→維持 95 秒、B→立即封閉等路徑；驗證在確認前不出結果，確認後鎖定。
7. 兩個 final choice 都各自完成，後果依固定 key 顯示且 refresh 不重設。

## 最終 runtime 紀錄

- `node --check playable-a3/assets/app.js`：PASS。
- `node --test playable-a3/tests/contract.test.mjs`：11 passed／0 failed。
- Browser：本機 A3 page identity、六格故事、非空 DOM、角色二四欄操作、evidence hidden→visible、console 0 issue：PASS。Chrome viewport override 要求 390 後仍回報 2560，未用它冒充手機證據。
- Playwright 補充：安裝中的 Chrome、三個隔離 context、1280×900／390×844／412×915：PASS；15 screenshots；horizontal overflow 0；console issue 0。
- 工具中途 refresh：指揮錯點草稿、救援 2/4、壓力 40 秒均保存；完成後三席 evidence 均保存。
- 查證：A→B→A draft change、confirm 前 result 0、confirm 後 result visible／choice locked、refresh 保存：PASS。
- 四分支：A+close、A+hold、B+close、B+hold 全部到達 consequence：PASS。
- consequence refresh：PASS。
- reset：只清 `momey-a3:`，刻意放入的 `momey-a2:shared` 保留：PASS。

`FULL_PLAYTHROUGH = PASS`。

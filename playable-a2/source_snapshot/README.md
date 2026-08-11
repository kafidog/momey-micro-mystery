# A2 source snapshot（CURRENT DRAFT）

此資料夾保留 source snapshot 的索引，而不是複製整個 repo。A2 runtime 的實際入口是上一層的 `index.html`，共用狀態和角色資料在 `assets/app.js`，視覺 token 在 `assets/styles.css`，六格圖在 `assets/storyboard/`。A1.2 仍在 repo 的 `playable-a1/`，沒有被 snapshot 或 A2 script 引入。

建置時不需要 npm、框架或 bundler；可用瀏覽器直接載入，或用任何靜態檔案伺服器提供 route。

# A2 截圖索引（CURRENT DRAFT）

本索引對應實際 runtime 的驗證狀態。P0 retry 使用本地 `http://127.0.0.1:8765/playable-a2/`；內建 Browser 已渲染並互動驗證目前角色 action、本機 readiness、查證、final、refresh/reset 與 role-switch guard。三個真正隔離 storage context 則由既有 Chrome headless 執行，沒有以外部頁面替代。

## 已捕捉的代表畫面

Playwright fallback 產出的本地暫存畫面：

- `momey-a2-entry-desktop.png`：1280×900，入口共同序章第一視窗。
- `momey-a2-entry-mobile.png`：390×844，入口行動版第一視窗。
- `momey-a2-role-mobile.png`：390×844，事件指揮角色操作介面。

上述舊檔目前位於工作站的 `C:\Users\USER\AppData\Local\Temp\`，不是 A2 source，而且早於 P0 readiness correction，不能單獨證明架構修正。P0 retry 的目前畫面由內建 Browser 在本次 review session 顯示；三個隔離 context 的證據以 DOM/state JSON、`tests/contract.test.mjs` 與 review docs 記錄，沒有新增 repo screenshot。

## 覆蓋狀態

| 畫面 | QA 狀態 | 證據 |
| --- | --- | --- |
| 共同序章／六 panel | 已渲染 | desktop/mobile screenshot、入口 DOM 文字檢查 |
| 三個角色首屏 | 已渲染 | role route DOM、mobile overflow 檢查 |
| 三個角色行動結果 | 已互動 | 三個隔離 context 各自只寫自己的 seat key；刷新後仍顯示 |
| 公開交換 | 已渲染 | action 後顯示口頭交換確認；沒有遠端完成 count；teamReady 後三張證據卡與兩個未知並存 |
| A/B 有限查證 | 已互動 | 三席在 action-only 時鎖定、teamReady 後解鎖；本機草稿刷新保存 |
| 共同決定／後果 | 已互動 | 四分支各自完成，確認後刷新保存 |
| reset | 已互動 | 回入口且 `momey-a2:` keys 清空 |

## 視覺檢查

已檢查概念圖 `C:\Users\USER\.codex\generated_images\019fe622-1d84-7521-8a58-11a27faaf16a\exec-27a3d3e0-870e-4214-a3f4-5cfede8f932b.png` 與最新本地渲染畫面：深海軍藍／鋼鐵面、暖白字、克制的琥珀／紅色提示、編輯感間距和窄版角色 console 保持一致。沒有新增圖片或影片。

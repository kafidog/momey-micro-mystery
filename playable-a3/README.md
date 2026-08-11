# MOMEY PLAYABLE A3

`/playable-a3/` 是 A2 的隔離互動里程碑。它保留海岬防洪站故事與固定真相，讓三席各自操作一件角色工具，再透過同室口頭交換進入一次查證與共同決定。

## 本地啟動

在 repository root 執行靜態 server：

```powershell
py -m http.server 4173 --directory .
```

然後開啟：`http://127.0.0.1:4173/playable-a3/`

也可直接使用 `index.html` 進行基本閱讀，但 rendered smoke 應以 server route 為準。

## A3 操作

- 指揮：點流程，再點正確時間終點；t=20 與 t=95 都完成才得到 evidence。
- 救援：逐項查看裝置簽名、兩點回應、時間邊界、位置／路線。
- 安全：把 range／marker 推到 95 秒；中間投影不是失敗。
- 交換：每席說自己的結果；確認「三個人的結果都已經說完了」後只顯示 compact 三行。
- 查證與決定：均採 draft → confirm → lock；四個 A/B×決定分支沿用 A2。

## State / reset

所有 A3 state 都以 `momey-a3:` 開頭保存。重新開始只清除 A3 prefix，不會清除 A2 或其他 route 的 state。

## Verification

```powershell
node --check playable-a3/assets/app.js
node --test playable-a3/tests/contract.test.mjs
```

精確 viewport／isolated-context smoke 位於 `tests/render-smoke.cjs`；其 Playwright module、base URL 與 screenshot output 以環境變數傳入，避免新增 repository dependency。

## Evidence boundary

Sol High 已完成 local source、rendered、synthetic 與 adversarial review：P0 0、Core P1 0。Deployment 與 final ZIP metadata 只會在 commit/push/public verification／packaging 實際完成後寫入 Desktop final review pack。真人 fun、F1/F2、WTP、E3/E4 仍無證據。

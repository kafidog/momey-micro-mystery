# MOMEY PLAYABLE A4

`/playable-a4/` preserves the A3 story and instruments, then adds a perspective-to-consensus loop: own evidence → current judgment → open sharing → one verification → reconsideration → shared commitment.

## 本地啟動

在 repository root 執行靜態 server：

```powershell
py -m http.server 4173 --directory .
```

然後開啟：`http://127.0.0.1:4173/playable-a4/`

也可直接使用 `index.html` 進行基本閱讀，但 rendered smoke 應以 server route 為準。

## A4 social loop

- 指揮：點流程，再點正確時間終點；t=20 與 t=95 都完成才得到 evidence。
- 救援：逐項查看裝置簽名、兩點回應、時間邊界、位置／路線。
- 安全：把 range／marker 推到 95 秒；中間投影不是失敗。
- 工具完成後，先記錄 Close／Hold／Unsure 的目前判斷。
- 公開分享全部事實、判斷與理由；compact board 只保留三行事實，不統計票數。
- A/B 維持 draft → confirm → lock；查證後記錄 Changed／Unchanged／Still unsure。
- 短討論完成後才解鎖 final commitment；四個固定分支沿用 A3。

## State / reset

所有 A4 state 都以 `momey-a4:` 開頭保存。重新開始只清除 A4 prefix，不會清除 A1、A2、A3 或其他 route 的 state。

## Verification

```powershell
node --check playable-a4/assets/app.js
node --test playable-a4/tests/contract.test.mjs
```

精確 viewport／isolated-context smoke 位於 `tests/render-smoke.cjs`；Playwright module、base URL 與 screenshot output 以環境變數傳入。

## Evidence boundary

Final Sol High review, deployment and package metadata remain pending until the complete QA and delivery sequence finishes. Actual fun, F1/F2, WTP, E3 and E4 remain unproven.

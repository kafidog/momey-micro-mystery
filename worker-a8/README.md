# A8 room Worker

`worker-a8` 是隔離的 Cloudflare Worker。每個六碼房間對應一個 SQLite-backed `A8Room` Durable Object，使用 WebSocket Hibernation callback 保存三席連線；所有 phase/version/seat/token/profile/action 都由 DO 權威保存。房間 inactivity TTL 是兩小時，alarm 到期後拒絕存取並關閉連線。

## 本地執行

```powershell
npm install
npx wrangler@4.120.0 dev --local --compatibility-date 2026-08-08 --ip 127.0.0.1 --port 8787
```

`wrangler.toml` 固定使用目前本地工具實際支援的 `2026-08-08` compatibility date。Worker 的 production URL 由靜態 client 預設為 `https://momey-playable-a8-room.momey-micro-mystery.workers.dev`；本委派不執行部署。

## 測試

```powershell
npm run test:engine
npm run test:room-code
npm run test:worker
npm run test:scope
npm run test:local
npm run test:frontend
npm test
```

部署後可對同一套六客戶端契約執行遠端驗證；這個命令會建立兩個暫時房間，房間仍依兩小時 inactivity TTL 自動到期：

```powershell
$env:MOMEY_A8_REMOTE_URL = 'https://momey-playable-a8-room.momey-micro-mystery.workers.dev'
$env:MOMEY_A8_TEST_ORIGIN = 'https://kafidog.github.io'
npm run test:remote
```

`test:local` 真正啟動 local Wrangler，建立兩個房間並連上各三個 Node WebSocket client；測試包含 Origin CORS 的 POST/GET snapshot、合法主路徑、duplicate/malformed/stale/future/token/operator/occupied/reconnect、audio master reassignment、私有結果隔離與 cross-room isolation。`test:frontend` 使用既有 Chrome executable 執行可重跑的 Playwright browser harness，避免依賴尚未下載的 Playwright bundled browser；若 Chrome 不在預設路徑，可用 `MOMEY_A8_BROWSER` 指定 executable。

`tests/engine.test.mjs` 的八種 ending 證據來自合法三席命令遍歷，而不是直接注入 shared tracks；每條代表路徑都實際完成三回合 action、三回合 discuss 和 unanimous vote，並檢查因果理由不含 engine key 或 profile key。

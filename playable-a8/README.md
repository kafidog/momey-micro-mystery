# MOMEY PLAYABLE A8

這是 A8 的靜態三人同房 playable。三支手機使用同一個六碼事件代碼，各自接手一個唯一角色；伺服器保存房間、階段、版本、角色連結、固定 profile 與行動，瀏覽器只顯示自己的私有查詢結果和房間共享進度。

## 本地預覽

在 repo 根目錄執行：

```powershell
python -m http.server 1574 --bind 127.0.0.1 --directory playable-a8
```

再以 `http://127.0.0.1:1574/index.html` 開啟頁面。若 Worker 在本地 Wrangler 執行，頁面會自動使用 `http://127.0.0.1:8787`；也可以用 `?worker=...` 指定本地 URL。

## A8 自動化驗證

從 `worker-a8` 執行 `npm test` 會依序跑純 engine、房間代碼 entropy/collision、Worker source、protected scope、本地 Wrangler Durable Object/WebSocket 三 client/兩 room，以及 Chrome 驅動的前端 E2E。前端 E2E 自己啟動並在 finally 清理靜態伺服器與 Wrangler，不需部署或打包。

前端測試涵蓋 390x844 主路徑、412x915 替代路徑、三個隔離 client context、CORS 建房到 lobby、八段序幕、三回合 action/discuss、R3 escalation 先字幕後選項、unanimous final vote、重連私有結果、缺音 fallback、master/non-master/replay、自動播放一次、同一 tab 第二房，以及水平溢出、觸控尺寸、可見文字與目前 phase DOM 檢查。

## 聲線與資產

`assets/audio/voice-manifest.json` 是對話與音檔的 canonical manifest。A7 延續音檔與 A8 新共同播報/結局皆使用 `Kokoro-82M-v1.1-zh / zm_010`，資產固定在 `assets/audio/kokoro-zm-010/`；未使用瀏覽器 TTS 或 Windows/SAPI 聲線。`tools/generate_static_voice.py` 保留可重跑的離線生成鏈，生成後以 `tools/build_voice_manifest.cjs` 更新 manifest。

播放器只有一個置於 rerender root 外的 hidden audio element。接手角色的手勢負責 prime；所有裝置顯示字幕，只有 audio master 自動播放。`ended`、play failure 和 bounded fallback timer 都能推進共同事件；重播是額外手勢，不會取代自動節奏。

部署由主線程另行處理；本目錄不包含部署、帳號、分析、聊天或永久房間產品化工作。

# MOMEY PLAYABLE A7

本機啟動：

```powershell
python -m http.server 1574 --bind 127.0.0.1
```

開啟 `http://127.0.0.1:1574/playable-a7/`。

驗證：

```powershell
node --test playable-a7/tests/contract.test.mjs
$env:MOMEY_A7_PLAYWRIGHT_MODULE='C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright\index.js'
node playable-a7/tests/render-smoke.cjs
```

A7 是純靜態、無後端的同室 3 人體驗。三支手機不會互相同步；同一 seed 只固定真相，玩家以口頭交換並各自在手機確認共同動作。

公開路徑：`https://kafidog.github.io/momey-micro-mystery/playable-a7/`（未宣傳）。

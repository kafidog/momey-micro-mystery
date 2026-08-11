# Role Tool Architecture

## 共通 runtime contract

每個 role seat 都保存：`toolProgress`、`actionComplete`、`actionAt`、`actionKey`、`teamReady`、`teamReadyAt`。共同 state 只保存 `verificationDraft`、`verificationConfirmed`、`verificationResult`、`finalDraft`、`finalConfirmed`、`consequence`。

工具完成前，`[data-role-result]` 為 hidden；完成後才插入四欄 evidence card。`<details>` 的「重新查看我的證據」只重開該席自己的 evidence。

## 角色對照

| Seat | 工具 | 玩家動作 | 完成條件 | 核心理解 |
| --- | --- | --- | --- | --- |
| 1 | 時間線重建 | 點流程，再點正確終點 | 封閉=t20、清線=t95 | t20 切斷仍需到 t95 的救援 |
| 2 | 訊號／來源檢視 | 打開四個欄位 | 四欄都看過 | 可信連結與有人操作成立；即時性／位置／路線不成立 |
| 3 | 壓力投影 | range 或 marker 推進時間 | 到 t95 | 壓力抵達東閘、高承責任清楚；撐架承載未知 |

三個工具都使用至少 44px 的互動目標；錯誤不鎖死流程。

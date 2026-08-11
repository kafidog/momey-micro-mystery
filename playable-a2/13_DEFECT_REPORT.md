# Defect Report

## Current triage

| Severity | Count | Evidence |
| --- | ---: | --- |
| P0 | 0（Luna retry worker assessment） | P0-01 已移除跨 seat gate；三個隔離 session 各自以 own action + own teamReady 解鎖，role switch 不能繞過 |
| Core P1 | 0 | 故事理解、full sharing、角色必要性、查證意義、copy/chronology 已由 source 和本地 QA 覆蓋 |
| P2 | 未逐項清零 | 仍可由 Sol High 在視覺或實體三機測試中提出 |

## 已修正的 worker-level issue

- P0-01：初版 `allActionsComplete()` 在單一 localStorage 要求 `seat:1/2/3` 全部完成，真實三支獨立手機會永久停在 1/3。修正後 `currentSessionReady()` 只檢查目前角色 seat 的 `actionComplete` 與 `teamReady`；玩家口頭交換後在各自手機明確確認，沒有遠端完成 ledger。三個隔離 Chrome context 各自只含自己的 seat key，刷新保存；換到未操作角色仍鎖定；reset 清空。現行 contract suite 也持續覆蓋此 gate。
- Core P1-01：初版 caption 把 `panel-02` 的破裂圖寫成單純地點，把 `panel-03` 的災後水霧／推車圖寫成 18:40 正常維修。修正後六格依序為 18:40 正常、18:47 破裂、西側災後、東閘危險、18:48 三人接手、單次查證與立即決定；六張 WebP 未改。contract 新增逐格 filename／heading／time／order assertion，明確拒絕 02=normal 與 03=18:40。
- 初版 storyboard crop 包含白色分隔線；已依 source 像素邊界重新裁成六個 WebP。
- 本地渲染第一次 console 出現 favicon 404；四個 HTML 改用空 data favicon，後續目標 app log 不再應有這個缺口。
- role shared situation 初版文字有多餘空白；已改成自然台灣繁中句子。

## 尚待 Sol 確認的邊界

- 內建 Browser 不能連本機服務，故使用工作站 Chrome fallback；不是 deployment proof。
- 沒有建立 commit、deploy、ZIP 或 Desktop delivery folder；依本次 worker 的唯一 write scope 和「不要發明 final metadata」規則保留 CURRENT_DRAFT。
- `localStorage` 不能跨真實手機同步；原型明確把 readiness、查證與決定留在各機本地並依賴同室口頭交換，沒有跨機共識鎖。

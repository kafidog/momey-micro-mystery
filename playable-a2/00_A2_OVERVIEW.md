# A2 Overview

## Milestone

MOMEY PLAYABLE A2 是一個新隔離路由的靜態 3-player prototype。它不是 `playable-a1/` 的小幅修字或換色；入口先給共同六格序章，再讓三位同隊玩家各自接手一條備援鏈路。

## 實際交付

- `index.html`：共同故事、六張圖、角色選擇。
- `role-1.html`、`role-2.html`、`role-3.html`：同一個角色 console 語意模板。
- `assets/app.js`：每支手機自己的角色 action、口頭交換 `teamReady`、localStorage、A/B 查證、兩段確認、四個後果分支。
- `assets/styles.css`：深海軍藍／鋼鐵面／暖白字／琥珀與紅色節點的 mobile-first UI。
- `assets/storyboard/panel-01..06.webp`：由既有 2×3 sheet 非破壞裁切的六格圖。
- `tests/contract.test.mjs`：無依賴 Node 靜態合約測試。
- `00`–`19` review docs：固定真相、邏輯架構、分支、壓力測試、文案和已知限制。

## 固定真相

18:40 林芮進入西側維修隧道、高承查看東閘；18:47 海水進水管破裂，主電力和中央遙測失效；18:48 三支備援鏈路接管。指揮得到 20 秒封閉與 95 秒救援的時間關係；救援得到林芮裝置的兩點回應但不能證明即時性；安全得到 95 秒壓力會抵達東閘且高承要留在撐點，但不知撐架確切承載。

剩餘電容只能驗證一次：A 查西側生命與推車路線，B 查東閘撐架。最後「立即封閉」會讓林芮在封閉障礙後失去生命；「維持 95 秒」會救出林芮、讓高承在控制廊隔離完成後死於東閘失效。查證不改寫物理真相。

## 驗證摘要

P0 修正後的 contract suite 使用三個隔離 session model，確認每一席只靠自己的 `actionComplete + teamReady` 即可到達查證，而且缺少任一條件都不能進入；source 明確拒絕在同一 storage 讀滿三個 seat key。渲染重驗證以三個隔離瀏覽器 context 進行，不把同一 profile 的跨角色狀態當成三支手機。Sol High 保留最終 verdict。

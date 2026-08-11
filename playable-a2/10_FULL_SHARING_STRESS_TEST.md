# Full Sharing Stress Test

## 測試方式

用三個彼此隔離的本地 storage/session model 分別開啟三個 role route。每個 session 只建立自己的 seat key：先完成目前角色 action，確認查證仍鎖定；再口頭交換三份結果，按本機 readiness 確認，確認查證解鎖。測試明確檢查 session 裡不存在另外兩個 seat key，也沒有使用「這個不能說」或任何拒絕分享的假設。

## 共享後仍然存在的問題

公開後畫面仍同時列出：

- 林芮的兩點回應是否即時，以及西側路線是否能走通。
- 東閘撐架能否承受完整 95 秒。

三個 action 仍各自必要：沒有指揮結果就沒有 20/95 秒互斥；沒有救援結果就沒有與林芮裝置簽名相符的人的證據；沒有安全結果就沒有高承留下與控制廊隔離的物理代價。

## 結果

**YES：full sharing 沒有讓答案自動出現。** 兩個未知仍存在，A/B 查證仍有意義，兩個 final choice 仍需隊伍承擔不同人物後果。玩家可以因為把人的現況放優先或把控制廊隔離放優先而不同意，但不是因為互不信任。

本地互動證據：三個隔離 session 都在「無 action」「只有 action」「只有 teamReady」時保持查證鎖定，只有自己的 `actionComplete + teamReady` 同時成立才解鎖；刷新後 readiness 仍在。公開交換區不顯示遠端完成數，只列三份需要聽到的角色貢獻。

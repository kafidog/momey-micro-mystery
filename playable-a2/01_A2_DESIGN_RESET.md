# A2 Design Reset

## 為什麼重做

A2 針對 A1.2 暴露的結構問題重建：玩家要先知道自己在哪裡、三人是什麼關係、事故怎麼變壞，再進入 role console。共同故事不再是短暫的資訊卡前言；手機也不再只是三份 clue card。

## 保留

- 3 人同室、一人一機的低基礎設施邊界。
- 壓力、溝通、有限查證和共同決定的核心張力。
- 靜態 route、localStorage、可刷新可重置。
- 兩個同樣有代價、沒有道德分數的終局。

## 丟棄或重建

- 不沿用 A1.2 的座位文字、卡片流程或資訊先後。
- 不用 P/Q、敵對陣營、忠誠度、保密規則製造衝突。
- 不用倒數計時作為玩法依賴；時間以固定事件時刻和 20／95 秒關係呈現。
- 不用外部 analytics、backend、帳號或通訊服務連接三支手機。

## 實際設計結果

`index.html` 的六格圖與 HTML caption 先完成 WHO → WHERE → NORMAL → INCIDENT → CHANGE → DANGER → WHY ACT NOW；各 role HTML 使用相同四欄 briefing；`app.js` 讓每支手機先完成自己的 evidence card，再由玩家口頭交換三份結果並在本機確認。手機不偵測其他裝置；確認後才顯示共同證據並解鎖 A/B，A/B 和 final 都有 draft → confirm → lock。

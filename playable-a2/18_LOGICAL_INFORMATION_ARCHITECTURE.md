# Logical Information Architecture

## 1. Authoritative shared timeline

| Time | Objective event |
| --- | --- |
| 18:40 | 林芮進入西側維修隧道；高承查看東閘手動撐架；設備正常 |
| 18:47 | 海水進水管破裂；主電力與中央遙測失效；壓力與水勢上升 |
| 18:48 | 三支分段備援鏈路接管同一個事故時刻；西側出口未確認，高承仍在東閘 |
| +20 秒 | 遠端封閉流程可完成，但會切斷西側推車路線 |
| +95 秒 | 救援推車若獲准，需要 95 秒清出西側路線；同一時段壓力前緣抵達東閘 |

## 2. Information hierarchy

1. **共同情勢／Level 1：發生什麼** — 同一個 18:48、地點、人物和事故。
2. **你的職責／Level 2：這對我的角色意味什麼** — role page 的 duty。
3. **現在已知／Level 1 facts** — 2–4 條短事實；不是推測。
4. **還不知道／Level 3 uncertainty** — 1–2 個 action 前的真未知。
5. **你可以做／Level 4 capability** — 一個角色專屬 action 和原因。
6. **共同決定／Level 5** — 已確認、仍未知、現在必須決定。

## 3. Shared frame vs private view

每個 role route 都先顯示「海岬防洪站｜同一個 18:48」和同一句盟友關係。private view 只包含該角色能調用的 action；三人以口頭方式交換 action 結果。每支手機在目前角色 action 完成後提供本機 readiness 確認，確認後才由 `renderTeamStages()` 顯示固定的三份共同證據。沒有永久秘密、禁止展示規則或跨裝置偵測。

## 4. Role-screen template

三頁 HTML 都固定使用：`共同情勢` → `你的職責` → `現在已知` → `還不知道` → `你可以做` → `你的操作` → `角色行動結果`。`roleData` 只替換角色名稱、職責、action 文案和結果，不改 semantic order。

## 5. Evidence-card template

`evidenceCard(evidence)` 只渲染四列：`來源`、`時間`、`內容`、`還不能確定`。action result 和 A/B result 都走同一 renderer；沒有答案式 label。

## 6. Fact / interpretation / uncertainty rules

- Fact 是 recorder cache、wearable query 或 analog waveform 真正回傳的內容。
- Interpretation 是玩家討論「這代表要救誰／先保哪裡」的理由，不由 UI 標成事實。
- Uncertainty 只寫 action/查證未能測量的邊界；查證後只移除已被選中的那一個邊界。

## 7. Aligned stage naming

`STAGE 01 共同序章`、`STAGE 02 角色簡報`、`STAGE 03 角色行動結果`、`STAGE 04 公開交換`、`STAGE 05 事故升級`、`STAGE 06 有限查證`、`STAGE 08 共同決定`、`STAGE 09 後果`。所有角色 route 使用相同 shared-stage renderer。

## 8. Action → result causality

指揮讀 cache → 得到 20/95 秒互斥；救援查 wearable → 得到 signed two-tap 及訊號邊界；安全讀 waveform → 得到 95 秒壓力與高承責任。每個 action button 只在對應 role route 啟用一次，結果寫入目前角色的 seat key。口頭交換後，`teamReady` 也寫進同一 seat；查證 gate 必須同時看到這個 seat 的 `actionComplete === true` 與 `teamReady === true`。

## 8a. Independent-phone readiness

三支實體手機各有獨立 localStorage。任一手機都不要求 `seat:1 + seat:2 + seat:3` 同時存在，也不顯示另外兩席的完成／等待狀態。`momey-a2:shared` 只是該手機自己的 verification/final state。換到另一個角色 route 時，gate 會改讀新角色自己的 seat；未完成新角色 action 與 readiness 確認就不能看到或操作查證／決定。

## 9. Final-decision information format

`已確認`（三支 action 的共通時間和選中查證內容）→ `仍未知`（查證留下的邊界和未選查證不會補回來）→ `現在必須決定`（立即封閉／維持 95 秒）。final draft 和 final confirmed 分開保存，確認後兩個 choice disabled。

## 10. Consequence format

每一個 branch 使用 `你們的決定`、`接著發生`、`後來確認`，最後只有一句「下一句話，你們會把什麼告訴下一個班次？」。不顯示 win/lose、good/bad 或 moral score。

## 11. Logical alignment audit table

| SCREEN | STAGE | WHO_SEES_IT | TIME | SOURCE | FACT | UNCERTAINTY | AVAILABLE_ACTION | GROUP_QUESTION | NEXT_STATE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| panel-01｜人員就位 | 01 | 三人 | 18:40 | `panel-01.webp` + caption | 海岬防洪站、林芮西側維修、高承東閘檢查、主系統正常 | 尚未發生事故 | 讀序章 | 誰在哪裡、原本在做什麼？ | panel-02 |
| panel-02｜進水管破裂 | 01 | 三人 | 18:47 | `panel-02.webp` + caption | 進水管破裂；主電力與中央遙測失效 | 兩端現況 | 讀序章 | 事故改變了什麼？ | panel-03 |
| panel-03｜林芮失聯 | 01 | 三人 | 18:47→18:48 | `panel-03.webp` + caption | 水霧、穿戴頻道、救援推車；沒有確認西側出口 | 人的回應是否即時、路線是否通 | 讀序章 | 西側還缺什麼？ | panel-04 |
| panel-04｜壓力逼近 | 01 | 三人 | 18:48 | `panel-04.webp` + caption | 高承守手動撐架；壓力沿東側往控制廊推進 | 撐架承載 | 讀序章 | 東側會付出什麼？ | panel-05 |
| panel-05｜你們接手 | 01 | 三人 | 18:48 | `panel-05.webp` + caption | 三名同隊玩家、同一控制室、三支分段備援手機 | 各子系統只回答一部分 | 選角色 | 為什麼是我們現在行動？ | panel-06 |
| panel-06｜只剩一次查證 | 01 | 三人 | 立即決定窗口 | `panel-06.webp` + caption | 一個高能診斷脈衝；立即封閉／維持 95 秒 | 未選查證仍未知 | 選角色 | 先查哪一端，再做什麼決定？ | 角色簡報 |
| role briefing | 02 | 對應 seat | 18:48 | roleData + role HTML | 該角色 2–4 facts | 該角色 1–2 unknowns | 一個 unique action | 我負責什麼？ | 角色 action |
| action evidence | 03 | 對應 seat，之後公開 | 18:48 | recorder / wearable / analog | 來源、時間、內容 | evidence boundary | 執行一次 | 我帶回什麼？ | 公開交換 |
| shared evidence | 04 | 各自手機，本機確認後 | 18:48 | 三人口頭交換 + 固定 action results | 20/95、two-tap、pressure | live/route、brace capacity | 本機確認交換完成 | 最大未知是什麼？ | 事故升級 |
| verification cards | 06 | 三人 | 18:48 + pulse | capacitor A/B | 選中結果 | 未選結果保留 | draft → confirm 一次 | 要查哪一端？ | 查證結果 |
| final summary | 08 | 三人 | 同一窗口 | all confirmed evidence | 已確認 | 仍未知 | final draft → confirm | 立即封閉或維持 95 秒？ | 後果 |
| consequence | 09 | 三人 | branch outcome | fixed truth | 客觀後果 | 沒有再補回的未知 | 口頭交接 | 告訴下一班次什麼？ | end/reset |

## 12. Contradiction audit result

已逐項對照：panel-01 承擔 18:40 人物／地點／正常維修；panel-02 承擔 18:47 破裂；panel-03 承擔西側災後失聯、穿戴與推車；panel-04 承擔東閘當前壓力；panel-05 承擔 18:48 三人接手；panel-06 承擔單次查證與立即決定。時間 18:40／18:47／18:48、姓名林芮／高承、地點和人物位置一致；四個 consequence 沿用同一物理真相。P0 readiness 修正仍有效。Sol High 仍需做獨立 final review。

# MOMEY PLAYABLE A6R

## 目的

A6R 是 A6 的 first-run UX correction milestone：保留既有海岬防洪站事件、三席角色、每席兩個診斷、兩個固定事件 profile 與兩個共同決定，只把正常遊玩改成一次只呈現一個當下 stage。

## 範圍

- 路徑：playable-a6r/
- runtime：純 HTML/CSS/JS、localStorage、URL seed
- 角色：作業時序、救援聯絡、結構安全
- stage：ROLE → CHOOSE → OPERATE → RESULT → DISCUSS → DECIDE → ENDING
- 語音：22 段預生成靜態 MP3、manifest 與原生 audio playback；字幕永遠可見

## 不在範圍

不修改 A1–A6、root、sr-h1/2/3、sr-assets、Worker、D1、GA4；不新增後端、帳號、同步、分析或付款。

## 狀態

Luna bounded implementation 已完成；Sol High 已接手並完成合約與 rendered QA。第二版聲線 `zm_010` 已生成並接入 22 段 MP3，owner 於 2026-08-12 接受暫定使用。Runtime / UX / regression / voice release gate 均已通過；最終 commit、部署與 ZIP 證據由 `17_AGENT_EXECUTION_RECORD.md` 記錄。

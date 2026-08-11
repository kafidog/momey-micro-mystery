# A3 Screenshot Index

本機 Playwright 以精確 viewport 產生 15 張證據；最終會複製到 Desktop review pack 的 `screenshots/`。同名檔案不提交到 runtime route，避免把 QA 二進位加入 Pages source。

| ID | 檔名 | 內容 | Viewport／狀態 |
| --- | --- | --- | --- |
| 01 | `01-entry.png` | 入口與六格共同序章 | 1280×900／CAPTURED |
| 02 | `02-role-command.png` | 指揮簡報 | 390×844／CAPTURED |
| 03 | `03-command-before.png` | 指揮工具未完成、證據 hidden | 390×844／CAPTURED |
| 04 | `04-command-corrected.png` | 指揮錯點可修 | 390×844／CAPTURED |
| 05 | `05-command-complete.png` | 指揮完成與自己的 evidence | 390×844／CAPTURED |
| 06 | `06-role-rescue.png` | 救援簡報 | 390×844／CAPTURED |
| 07 | `07-rescue-before.png` | 四欄尚未全看 | 390×844／CAPTURED |
| 08 | `08-rescue-complete.png` | 救援完成與 evidence | 390×844／CAPTURED |
| 09 | `09-role-safety.png` | 安全簡報 | 412×915／CAPTURED |
| 10 | `10-safety-mid.png` | 40 秒中間投影 | 412×915／CAPTURED |
| 11 | `11-safety-complete.png` | 95 秒完成與 evidence | 412×915／CAPTURED |
| 12 | `12-compact-board.png` | 公開交換後三行 board | 390×844／CAPTURED |
| 13 | `13-verification.png` | 查證 confirmed／locked | 390×844／CAPTURED |
| 14 | `14-final-summary.png` | compact final summary | 390×844／CAPTURED |
| 15 | `15-consequence.png` | consequence | 390×844／CAPTURED |

Browser plugin 亦完成 page identity／DOM／角色二互動／console 驗證；其 Chrome viewport override 要求 390 後仍回報 2560，因此沒有把該畫面列作手機尺寸證據。

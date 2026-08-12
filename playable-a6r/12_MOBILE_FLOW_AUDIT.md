# Mobile Flow Audit

目標 viewport：390×844、412×915。

## Runtime CSS contract

- overflow-x: clip
- body font-size 16px
- primary / secondary controls min-height 48–50px
- role stage single column
- diagnostic / decision options 在窄寬度改為單欄
- current stage 不疊成長頁面

render smoke 讀取 document.documentElement.scrollWidth、可見 controls 尺寸與主要 gate。2026-08-12 在 390×844 與 412×915 實際執行 PASS：無水平溢位、可見主要 control 達 touch target、每個 gate 只顯示當下 stage。

# Role Stage Flow

## Fresh ROLE

角色頁初始 current stage 只顯示：

- 角色名
- 【你負責】一句
- 【現在要做】一句
- 唯一 dominant CTA：開始

operator、進度、reference、troubleshooting 與後續 stage 不在 root markup。

## Started flow

開始後依序顯示 CHOOSE、OPERATE、RESULT、DISCUSS、DECIDE、ENDING。每次 render 只保留一個 data-stage-purpose。

## Decision custody

診斷 draft 可改；confirm 後鎖定。共同選項 draft 可改；agreement 前 final confirm disabled，agreement 後才可執行。

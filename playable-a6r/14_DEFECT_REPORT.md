# Defect Report

## Closed in bounded correction

| Finding | Correction |
| --- | --- |
| ROLE 首屏帶出 operator/progress/reference/troubleshooting | fresh renderRole() 只輸出 roleStage(role) |
| role topbar 暴露目前角色 / 岬衛-7 meta | role HTML 移除 topbar meta |
| reference control 沒有靜態 dialog shell | 三個 role HTML 加入空 dialog shell |
| drawer topology 未按 current purpose 分層 | referenceMarkup() 依 state gate 組裝 |
| brand 高度僅 30px，低於手機 touch target | `.brand` 最小高度調整為 48px |
| final agreement 前兩個 control 同名「說出共同選擇」 | final confirm 改為清楚的「確認共同決定」 |
| rendered test 以 hidden seed 的 `innerText` 取值 | 改用 `textContent` 驗證折疊內容確實存在 |
| 第一版 `zf_001` 聲線 owner 明確退回 | 從 runtime 移除，改生成並接入 `zm_010` 22 段 |

## Verification

- `node --test playable-a6r/tests/contract.test.mjs`：12/12 PASS。
- `node playable-a6r/tests/render-smoke.cjs`：PASS。
- console issues：0；unexpected request failures：0。
- owner 對第二版聲線 `zm_010` 的主觀 verdict：OPEN，屬 release gate，不是程式缺陷。

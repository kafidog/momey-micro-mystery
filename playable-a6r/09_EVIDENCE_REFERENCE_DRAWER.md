# Evidence Reference Drawer

reference dialog 是三個 role HTML 的靜態空 shell；資料由 referenceMarkup(role, state) 依目前 gate 產生。

| Current purpose | 可查看 |
| --- | --- |
| CHOOSE / OPERATE | 角色責任、initial known |
| RESULT / DISCUSS | 上述資料、已確認 diagnostic 的 found / means / unknown |
| DECIDE | 上述資料、已交換狀態；不含 consequence |
| ENDING | 上述資料、已到達 consequence |

未選 diagnostic、未到決定、未到 consequence 不會放入 drawer。ROLE stage 沒有 reference button。close button 與 Escape 都會關閉；沒有 dialog API 時以 open attribute fallback。

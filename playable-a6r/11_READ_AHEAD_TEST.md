# Read-Ahead Test

## Required assertions

每個 gate 的 current-stage markup 只含當下 data-stage-purpose：

- fresh：無 result / final / consequence
- before diagnostic confirm：無 result
- before result share：無 DISCUSS / DECIDE
- before discussion complete：無 final controls
- before final confirm：無 consequence

測試同時檢查 normal scroll 的 document 不會因為已 render 的後續 stage 暴露內容；A6R 將後續內容留在 state gate 之外，而不是用 CSS 隱藏。

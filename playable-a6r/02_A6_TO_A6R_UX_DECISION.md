# A6 to A6R UX Decision

## 保留

共同序章與六張 storyboard art、三個平等人類角色、每席兩個診斷、兩個 profile、固定 operator dialogue、資訊交換、共同決定、固定後果、refresh/reset 與靜態架構。

## 改變

renderRole() 在 ROLE 只 render role card；開始後才加入 operator panel、progress、reference 與 troubleshooting。後續每個 render 只產生一個 current stage。

## 驗收邊界

future result、final decision、consequence 不得在未到 gate 時進入 current-stage markup。合約與 rendered DOM 檢查均已驗證此邊界；最終 release PASS 仍取決於 owner 對候選聲線的接受。

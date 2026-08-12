# Progressive Disclosure Architecture

## State

每席 A6R state 只保存：

roleStarted、coordinationConfirmed、diagnosticDraft、diagnosticConfirmed、resultAcknowledged、discussionConfirmed、finalDraft、agreementSpoken、finalConfirmed、currentDialogue、dialogueHistory。

## Gate

| State gate | Current purpose | Main content |
| --- | --- | --- |
| fresh | ROLE | 角色責任、現在要做、開始 |
| roleStarted | CHOOSE | 協調三席各查什麼 |
| coordinationConfirmed | OPERATE | 兩個當前診斷選項 |
| diagnosticConfirmed | RESULT | 已確認診斷結果 |
| resultAcknowledged | DISCUSS | 把發現交換給隊伍 |
| discussionConfirmed | DECIDE | 共同選項 draft / agreement / confirm |
| finalConfirmed | ENDING | 固定後果 |

未到 gate 的區塊不是 CSS 隱藏，而是沒有由 currentStageMarkup() 產生。

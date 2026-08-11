# Limited Verification

公開交換完成後，兩個未知仍同時存在：林芮回應的即時性／西側路線，以及東閘撐架承載。剩餘電容只能發出一個脈衝。

## A／西側路線掃描

- 可以知道：林芮仍在西側抬高避難龕，救援軌道仍可通，清線需要 95 秒。
- 仍不知道：東閘撐架能否承受完整 95 秒。

## B／東閘載重測試

- 可以知道：東閘撐架無法承受完整 95 秒，高承必須留在撐點。
- 仍不知道：林芮穿戴頻道的兩點回應是不是即時傳送。

## State contract

`verificationDraft` 可改；`verificationConfirmed` 只有按確認後才寫入；`verificationResult` 只有確認後才 render。確認後選項 disabled，結果鎖定。

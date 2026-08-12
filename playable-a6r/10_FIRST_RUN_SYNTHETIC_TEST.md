# First-Run Synthetic Test

## Scope

tests/render-smoke.cjs 以三個 role URL、不同 browser contexts、390×844 / 412×915 與兩個 profile seed 走 first-run flow。

## Checks

- fresh role 只有 ROLE card 與開始
- 開始後才有 operator/progress/reference/troubleshooting
- diagnostic draft 可改，confirm 後進 RESULT
- RESULT、DISCUSS、DECIDE、ENDING 逐 gate 出現
- 兩個 profile × close/hold 四個 consequence branches
- refresh、reset、缺音檔 fallback、console、overflow、touch

## 2026-08-12 結果

Sol High 在 Luna 重試後接手 rendered QA。三個隔離 browser context 均從 fresh ROLE 只使用可見控制完成首跑；breakline/backwash × close/hold 全可達。390×844、412×915、refresh、reset、MP3 實播與強制缺檔降級均 PASS；console issue 0、非預期 request failure 0。

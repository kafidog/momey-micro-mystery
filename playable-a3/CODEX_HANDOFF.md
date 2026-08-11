# MOMEY A3 CODEX HANDOFF

## Current goal

完成 `/playable-a3/` 的三個角色工具、同室口頭交換、compact board、一次有限查證、final decision 與四分支後果；保留 A2 故事與固定真相。

## Phase

Release preparation。狀態 `SOL_LOCAL_PASS / PRE-COMMIT`；Luna 完成主體後其 rendered QA 無回應，Sol 已限定接管 QA／harness 與 command pre-reveal Core P1 修正。

## Important files

- `index.html`：六格共同序章與角色選擇。
- `role-1.html`／`role-2.html`／`role-3.html`：三席簡報與 runtime mount points。
- `assets/app.js`：A3 state、工具、sharing、verification、decision、consequence。
- `assets/styles.css`：A2 visual foundation 加 A3 mobile tool styles。
- `tests/contract.test.mjs`：source/state/protected-path contract。

## Required verification

```text
node --check playable-a3/assets/app.js
node --test playable-a3/tests/contract.test.mjs
```

實際結果：11/11 contract；Browser page identity／DOM／互動／console PASS；Playwright 三 isolated context、1280×900／390×844／412×915、15 screenshots、四分支、工具中途與完成 refresh、verification lock、consequence refresh、A3-only reset 全 PASS。

## Boundaries

不得修改 A2、A1、root、sr-h1/h2/h3、sr-assets、Worker、D1 或 GA4。下一個安全任務是 staged-scope review → runtime commit/push → public Pages verification → Desktop review pack／ZIP final metadata；完成後停止。

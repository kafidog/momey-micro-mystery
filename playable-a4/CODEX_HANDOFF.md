# MOMEY A4 CODEX HANDOFF

## Current goal

完成 `/playable-a4/` 的 perspective-to-consensus loop；保留 A3 故事、工具、固定真相與四分支。

## Phase

Independent Sol QA in progress. Luna completed the primary runtime but stalled before formal handoff and complete docs/contracts; Sol has taken over that bounded remainder.

## Important files

- `assets/app.js`: A4 state, tools, initial judgment, sharing, verification, reconsideration, final and consequence.
- `tests/contract.test.mjs`: 18 source/state/social-flow/protection contracts.
- `tests/render-smoke.cjs`: bounded exact-viewport and branch QA with guaranteed browser cleanup.

## Required verification

```text
node --check playable-a4/assets/app.js
node --test playable-a4/tests/contract.test.mjs
```

Final rendered results are pending Sol execution.

## Boundaries

不得修改 A1、A2、A3、root、sr-h1/h2/h3、sr-assets、Worker、D1 或 GA4。下一個安全任務是 Sol independent QA; no deployment until internal PASS.

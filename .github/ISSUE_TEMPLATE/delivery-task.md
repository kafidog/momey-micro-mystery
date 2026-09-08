---
name: Delivery Task
description: 一條可直接交給 Codex/Luna 執行並由 Sol Gate 驗收的完整交付流程
title: "[P0][DELIVERY] "
labels: []
assignees: []
---

## GOAL
一句話描述真人玩家/使用者完成後能得到什麼結果，不要只寫技術動作。

## CURRENT BASELINE
記錄 branch / HEAD / dirty state、`AGENTS.md`、唯一最新 handoff（若存在）與本 Issue 直接相關的成果/限制。本機較新時以本機為準；禁止 reset/clean/覆蓋成果。

## SCOPE
完成一條完整可驗收流程及所需最小程式、資料、UI、測試、資產與文件修改。

## NOT TO DO
不開第二條大型功能線、不重做已驗收內容、不重構無關模組、不建不必要平台/監控/大量報告、不改寫 Git 歷史或丟棄 dirty work。

## DEPENDENCIES
真正阻塞的前置 Issue、外部事件、授權或人工 Gate；沒有寫 `None`。

## SHARED CAPABILITY CHECK
Registry technical_stable → experimental → 專案既有 → 官方 → 成熟 OSS → 最後才新增。只有改善產品結果才採用。

## IMPLEMENTATION
Codex/Luna 自行完成最小必要修改；一般可解問題不要停下來要求 Owner 逐步決策。

## VALIDATION
產品修改先最小相關測試，交付前一次必要整體驗證；文件/治理只驗 diff。Build/test PASS 不可取代玩家/runtime 證據；驗證工具與產品失敗分開。

## EVIDENCE
只保留足以讓 Sol 判斷成功/失敗的本輪證據；歷史證據不得冒充本輪驗證。

## FAILURE POLICY
同一失敗假設最多兩次無進展嘗試；分類：`PRODUCT` / `VALIDATION` / `EXTERNAL` / `HUMAN_AUTH` / `EVIDENCE_INSUFFICIENT`。

## ACCEPTANCE
- [ ] 真人流程完整
- [ ] P0/P1=0 或狀態正確保持 PARTIAL/FAIL
- [ ] scope drift=0
- [ ] 必要測試通過
- [ ] 有本輪產品證據
- [ ] 無明顯回歸
- [ ] 共享能力若有使用已證明改善
- [ ] Git 可回退
- [ ] Sol Gate 完成

## GIT
只提交本 Issue 可分離且已驗證修改，不夾帶未知 dirty work。

## REPORT
只回填：`RESULT`、`FILES_CHANGED`、`USER_VISIBLE_RESULT`、`VALIDATION`、`EVIDENCE`、`KNOWN_ISSUES`、`SCOPE_DRIFT`、`COMMIT`、`NEXT_SINGLE_ACTION`。

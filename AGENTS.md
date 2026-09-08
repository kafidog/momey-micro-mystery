# Agent 與交付治理

本文件定義此 Repository 的預設 AI/Codex 執行流程。它只統一「怎麼工作」，不覆蓋專案既有的產品、安全、授權、隱私、發布或技術限制；若其他專案文件有更嚴格規則，以更嚴格者為準。

## Astra Era

- `Astra Medium`：只在新專案、新 Phase、重大方向改變、重複失敗或 Final Review 進場；負責全局理解、架構、P0/P1/P2、Delivery Issue 拆解、依賴、Gate 與風險。
- `Sol High`：執行期 Supervisor / Reviewer / Final Gate；負責範圍、Git、測試、Evidence 與最終判定。
- `Luna MAX`：主要 Executor；負責大部分 implementation、research、tests、fixes、documentation 與 evidence。
- 升級順序固定：`Luna MAX → Sol High → Astra Medium → Astra High → Astra XHigh`。High/XHigh 只用於真正僵局、重大架構衝突、反覆失敗或高風險不可逆決策。

## 預設工作流

使用 `Goal → Delivery Issue → Codex/Luna → Evidence → Sol Gate`。

- 一個 Delivery Issue = 一條真人可使用、可驗收、可獨立交付的完整流程，不拆成微型 Issue 海。
- 正常只讀三層上下文：永久規則、唯一最新 handoff、當前最高優先且已解除阻塞的 Delivery Issue。
- 同一時間只執行一個 Delivery Issue；完成/阻斷/停止後才進下一個。
- 小型已定位問題可直接最小修復、驗證、提交，不為流程形式額外建 Issue。

## 交付優先規則

- 不重做已驗收內容，不用主觀完成度替代證據。
- 產品修改先跑最小相關測試，交付前一次必要整體驗證；純文件/治理修改不重跑產品測試。
- 同一失敗假設最多兩次無進展嘗試；沒有新證據就停止並由 Sol 換方法、放棄或升級。
- 失敗分類：`PRODUCT`、`VALIDATION`、`EXTERNAL`、`HUMAN_AUTH`、`EVIDENCE_INSUFFICIENT`。
- 只有登入、OAuth、2FA、CAPTCHA、條款、人工授權、無法控制的實體裝置或真正外部事件才算 HUMAN_AUTH/EXTERNAL。
- 保留既有資料、授權、修改、素材與 dirty work；禁止為了乾淨 reset/clean/覆蓋成果。

## 共享能力

從產品缺口出發依序查 Registry technical_stable → experimental → 專案既有能力 → 官方能力/工具 → 成熟 OSS → 最後才新增工具。安裝、Registry 登記、技能數、包裝或測試 PASS 不等於產品改善；只有「實際套入產品 → 可見/可測改善 → 無明顯回歸 → Sol 接受」才算落地。專案專用內容不要為共享而過早抽象化。

## 驗證與證據

- Build/lint/test PASS 只能證明對應工程條件，不能冒充實際玩家/使用者流程成功。
- UI、互動、畫面、遊戲流程或輸出要有本輪實際證據；歷史截圖/錄影/log 不得冒充重驗。
- 驗證工具失敗與產品失敗分開判定；證據少而有效，不按代理角色複製大量報告或 ZIP。
- 唯一最新 handoff 只保留實際 branch/commit、Gate、已驗證/未驗證、風險、回退點與唯一下一步。

## Git 與範圍

- 只修改當前 Delivery Issue 最小必要範圍。
- 禁止 `git reset --hard`、`git clean -fd`、force push、改寫已發布歷史或刪除未知資料。
- 不提交秘密、個資、瀏覽器資料、快取、來源不明 binary/資產或其他專案資料。
- 只有 P0/P1=0、scope drift=0、必要驗證完成且 Sol Gate 通過才能宣稱 PASS。

## GitHub 交接與同步（每個 Delivery Issue 結束必做）

GitHub 是跨工作階段的唯一交接來源。Owner 不應再需要把已存在 GitHub 的報告、Markdown 或 ZIP 重新上傳給下一個 AI。

每個 Delivery Issue 完成、PARTIAL、FAIL 或 BLOCKED 時，在最後回覆前必須：
1. 更新或建立根目錄唯一 `CODEX_HANDOFF.md`，不得建立日期版/代理版重複 handoff；至少記錄 Current Goal、Issue、branch/HEAD、RESULT、FILES_CHANGED、USER_VISIBLE_RESULT、VALIDATION、EVIDENCE、KNOWN_ISSUES、未驗證項目、Blocker、rollback、`NEXT_SINGLE_ACTION`。
2. 若有 GitHub Delivery Issue 且環境可寫入 GitHub，回填 RESULT / VALIDATION / EVIDENCE / COMMIT / NEXT_SINGLE_ACTION；若無 Issue 寫入能力，不得假裝已回填，但 handoff 與 Git push 仍為必做。
3. 只 stage 本 Issue 可安全歸屬且已驗證的修改，建立清楚 commit；未知 dirty work 不得混入。
4. 將 commit 與最新 `CODEX_HANDOFF.md` **push 到 GitHub 遠端**；使用目前追蹤 branch，無 upstream 時安全使用 `git push -u origin <branch>`。禁止 force push。
5. 若採 PR/受保護分支流程，只 push 工作 branch 並留下 PR/commit 參照；不得繞過保護、merge、deploy、release 或公開發布，除非當前授權明確允許。
6. push 後驗證本機 HEAD 已存在遠端追蹤 branch，最終回報必寫 `GITHUB_SYNC=PUSHED` 與 commit SHA。
7. 若因憑證、網路、remote 權限或 branch protection 無法 push，保留本機 commit，寫 `GITHUB_SYNC=BLOCKED`、原始錯誤、尚未上傳 commit SHA 與恢復條件；產品結果與 GitHub 同步結果分開。

此規則是 Owner 對一般 Git source-control 同步與 handoff 更新的持續授權；**不等於** deployment、release publication、社群發布、付款、OAuth/2FA 或其他高風險外部操作授權。

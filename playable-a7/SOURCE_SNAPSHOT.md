# Source Snapshot

`source_snapshot/` 會在最終 package 時由 repository 的 final runtime commit 匯出，不從 dirty worktree 任意複製。它應與部署的 `playable-a7/**` runtime 和文件逐檔一致，不包含 `.git`、暫存 WAV、模型權重、cache 或 Desktop 包裝腳本。

Authoritative repository：`kafidog/momey-micro-mystery`，branch `main`。

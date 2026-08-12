# Event Seed Hiding

## 玩家正常流程

玩家只看到「三條角色連結屬於同一場事件」。角色 URL 仍保留 ?seed=，用來讓三席得到同一個固定 profile，但 raw seed 不在頂欄或 primary onboarding。

## Troubleshooting

入口與角色頁都使用折疊的「遇到問題？查看事件資訊」。展開後才填入識別碼。這是診斷連結問題的工具，不是遊戲規則。

## Reset

namespace 是 momey-a6r:。reset 只清目前 seed 的 A6R role keys，再導向新的 A6R event；不呼叫 localStorage.clear()。

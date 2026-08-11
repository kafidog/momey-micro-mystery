# Known Limitations

- 這是 static/local prototype，沒有 WebSocket、database、account 或跨裝置同步；真實同室玩家要口頭交換資訊。
- 每支手機只保存自己的角色 action、`teamReady`、查證與決定；手機不會偵測另外兩支裝置。`teamReady` 是玩家口頭交換後的本機確認，不是遠端完成證據。
- 三支手機的查證／決定 state 彼此獨立；原型依賴同室玩家在按確認前形成同一選擇，沒有技術性跨機共識鎖。
- 沒有 real-time countdown；固定 20 秒和 95 秒只表達因果時間窗。
- 圖像是 accepted Sol High visual direction 的 prototype storyboard crop，不是 production art，也沒有影片、聲音或配音。
- 本輪 QA 使用 Chrome headless fallback；內建 Browser 對 Windows localhost 失敗，因此沒有宣稱 Browser、GitHub Pages 或部署通過。
- 沒有做真人 fun、WTP、E3、E4、Game01 或 commercial readiness 判定。
- 沒有 commit、push、deploy、publish、ZIP 或 Desktop delivery folder；`16_AGENT_EXECUTION_RECORD.md` 以明確 CURRENT_DRAFT 標示這些待 Sol 處理的 metadata。

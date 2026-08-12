# Owner First-Run Findings

本文件記錄本 milestone 的輸入，不宣稱 Luna 重新取得人類實測。

## 已知問題

1. A6 把多個遊玩 stage 疊在長頁面，玩家可以向下讀到後續控制。
2. raw event code / seed 出現在正常 onboarding，玩家不需要理解它。
3. browser/OS synthetic TTS 品質降低體驗。
4. first run 應先於 replay value；A6R 不增加新內容或 replay complexity。

## A6R 對應

- current stage only，未來 stage 不先 render。
- seed 只放 troubleshooting details，URL contract 保留。
- browser speechSynthesis 從 A6R runtime 移除，預留 static clips。
- first screen 只回答角色、責任、現在行動與「開始」。

# Audio Removal and Static Clip Replacement

## 已移除

A6R runtime 完全不含 browser speechSynthesis / SpeechSynthesisUtterance。 不依賴 OS voice、不下載模型、不呼叫外部 TTS/API。

## 接替介面

assets/audio/voice-manifest.json 定義 22 條固定對話，runtime 使用本機 audio。正常控制只保留：

- 聲音：開／關
- 重播這句

字幕永遠可見。建議只一支手機開聲音；SFX 可保留但不是理解資訊的必要條件。

## 音檔狀態

目前 runtime 含 `kokoro-zm-010/` 下 22 段 MP3，與 manifest 22 個 entry 一一對應。實際播放已由 rendered smoke 驗證。刻意將當前音檔指向不存在檔案時，UI 會顯示「音訊暫時無法播放，請看字幕」，流程仍可繼續。

第一版 `zf_001` 已由 owner 退回，且不在 runtime 內。`zm_010` 是第二版候選；在 owner 明確接受前不部署。

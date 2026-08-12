# 語音與文字一致性

唯一 canonical source：`assets/dialogue-data.js`。每筆記錄都有：

`DIALOGUE_ID, STAGE, PROFILE, TRIGGER, CAPTION_TEXT, VOICE_TEXT, AUDIO_FILE, MEANING_TAG`。

`tools/build_voice_manifest.cjs` 只從該來源產生 `assets/audio/voice-manifest.json`；不手動維護第二份內容。14 筆選擇性發聲：8 段序章、角色／交換轉場 2 句、4 個結局。12 個診斷結果是結構化文字，不朗讀每一塊。

聲線：Kokoro-82M-v1.1-zh `zm_010`，owner 於 2026-08-12 暫定使用。最終資產為 14 個 MP3、810,486 bytes、24 kHz、mono、64 kbps；ffmpeg 全檔解碼 PASS。瀏覽器沒有 TTS。

完整逐句人工判斷見 `VOICE_CAPTION_SEMANTIC_AUDIT.md`；14/14 `SAME_MEANING = YES`。

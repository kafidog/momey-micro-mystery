# Operator Text-Only Design

岬衛-7 保留為固定、簡短、in-world 的播報存在。runtime 不接受自由文字、不使用生成式 AI、不把技術分類直接交給玩家。

## UI wording

正常 UI 使用「現場播報」「字幕」「聲音：開／關」「重播這句」。不顯示 model、voice selector、TTS engine、generation status 或設計分類。

## Dialogue split

每列 dialogue 同時保存 captionText 與較短 spokenText。screen caption 承載完整關鍵事實，spoken line 只增加節奏與氣氛；關鍵資訊不只存在音訊。

## Runtime safety

音訊缺失、播放錯誤或 autoplay policy 都只能改變 status，不能阻塞 stage progression。

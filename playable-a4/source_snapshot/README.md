# A3 Source Snapshot

本目錄不是第二份 runtime source；它記錄 A3 的唯讀來源與資產邊界。

```text
SOURCE_REPO = C:\Users\USER\Documents\ChatGPT\設定\momey-micro-mystery
SOURCE_ROUTE = playable-a2/**
SOURCE_HEAD = 8416979be59bf39bb57a20ebedabac8f55a4aaca
A3_ROUTE = playable-a3/**
ASSET_POLICY = six storyboard WebP copied byte-for-byte; no redraw or regeneration
```

A2 source 沒有被改寫；A3 的 `assets/storyboard/panel-01.webp` 至 `panel-06.webp` 由 contract test 以 SHA-256 逐檔比對 A2 同名檔案。

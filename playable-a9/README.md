# MOMEY PLAYABLE A9

A9 is a same-room, three-phone cooperative incident. It replaces A8's repeated text-card selection with two live operating windows and a final coordinated operation.

## Player loop

`SEE → OPERATE → SHOUT → REACT`

- 現場調度 routes backup power and operates the final gate lever.
- 救援聯絡 advances and secures the rescue trolley while reading exact route and heat signals.
- 結構安全 braces the gate, deploys the one-use shield, and owns exact pressure/exposure signals.

Each phone exposes one exact instrument family. All information may be spoken; there is no traitor, secrecy rule, captain, chat, account, payment, analytics, LLM, or client-authoritative outcome.

## Runtime

- Static client: `playable-a9/`
- Isolated Cloudflare Worker: `worker-a9/`
- Durable Object class: `A9Room`
- Production Worker: `momey-playable-a9-room`
- Default room lifetime: two hours
- Live authoritative windows: 70 seconds, 60 seconds, 45 seconds

The Durable Object owns seats, timestamps, controls, physical state, checkpoints, reconnect and outcome. Clients send bounded intents with phase/version envelopes. A disconnected hold is released to neutral.

## Local verification

From `worker-a9/`:

```powershell
npm run test:engine
npm run test:structural
npm run test:worker
npm run test:scope
npm run test:local
npm run test:frontend
```

The frontend suite runs three isolated mobile browser contexts against a real local Wrangler Durable Object and a real authoritative clock.

## Operator voice

`assets/dialogue-data.js` is the canonical caption/spoken-source table. The browser receives frozen MP3 files only. The accepted provisional A6R/A7/A8 voice chain remains `Kokoro-82M-v1.1-zh / zm_010`.

Rebuild procedure:

1. Run `node playable-a9/tools/build_voice_manifest.cjs` to establish the manifest rows.
2. Run `playable-a9/tools/generate_static_voice.py` in an environment containing Kokoro, PyTorch, SoundFile and FFmpeg.
3. Run the manifest builder again and require `assetStatus: READY`.

Audio failure does not block play: all devices retain captions and the audio-master phone advances after the bounded fallback.

## Scope

A9 is isolated. It does not modify A1–A8, the existing evidence counter Worker/D1, GA4, acquisition pages, accounts, payments, chat, profiles or generic platform infrastructure.

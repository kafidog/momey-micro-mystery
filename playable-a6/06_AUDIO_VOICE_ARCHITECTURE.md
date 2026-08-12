# Audio and Voice Architecture

## Caption-first contract

Every operator line is rendered as visible HTML before any sound attempt. Progression never waits for speech or SFX.

## Voice

- API: `window.speechSynthesis` only;
- voice preference: exact `zh-TW`, then any `zh`, then browser default;
- `speechSynthesis.cancel()` runs before a new line to prevent overlap;
- shared voice is a local toggle, default OFF;
- any role may enable it; this grants no gameplay authority;
- mute and replay controls remain available;
- unavailable APIs or speech errors leave captions and controls usable.

## SFX

WebAudio creates short low-volume tones for start, signal, diagnostic, escalation, decision, and consequence states. The gain peak is 0.035 and each cue lasts about 0.24 seconds. There is no loop, music, external audio asset, or paid service.

Every sound cue also updates a visible cue pill. No information exists only in audio.

## Verified local paths

- normal speech-capable browser path: PASS;
- speech API removed before page load: game remained visible and diagnostic progression worked;
- captions: present;
- mute, replay, shared-audio controls: present and touch-sized;
- console issues during smoke: 0.

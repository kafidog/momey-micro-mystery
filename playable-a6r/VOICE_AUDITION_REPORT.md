# Voice Audition Report

## Input evidence

The owner-provided A6R goal records an initial audition pack as already generated for:

- HyperFrames zf_xiaobei: 5 representative lines
- official Kokoro v1.1 zf_001: 5 representative lines
- official Kokoro v1.1 zm_010: 5 representative lines
- MeloTTS ZH: 5 representative lines

Sol generated and inspected all four candidate sets locally. The owner explicitly rejected the first full runtime voice, `zf_001`; a second complete runtime was generated with `zm_010`.

## Representative line types

1. calm introduction (OP_BOOT)
2. urgent warning (BL_S1)
3. short diagnostic result (BL_O1)
4. unavailable-data boundary (BW_R1)
5. consequence / closing (BL_CLOSE)

Names, times, numbers and mixed technical fragments remain in the captions and are part of Sol's subjective review scope.

## Candidate and license notes

| Candidate | Primary source / license | Audition outcome |
| --- | --- | --- |
| HyperFrames `zf_xiaobei` | Installed `npx hyperframes tts --list` path; 5 lines generated | Technically generated, but the installed path exposed only one Chinese voice and did not provide a stronger owner-approved result than the later Kokoro candidate. Not selected. |
| Kokoro-82M-v1.1-zh `zf_001` | [Official model card](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh), Apache-2.0 | 5-line audition and a complete 22-line runtime generated. Owner rejected it after listening; removed from runtime. |
| Kokoro-82M-v1.1-zh `zm_010` | [Official model card](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh), Apache-2.0 | 5-line audition and complete 22-line runtime generated. Owner accepted it for temporary A6R use. Selected. |
| MeloTTS ZH | [Official repository](https://github.com/myshell-ai/MeloTTS), MIT | 5 representative lines generated locally. Kept as a technically available fallback; not promoted to a full runtime after the owner accepted `zm_010`. This is not a claim that MeloTTS objectively failed. |

[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) was inspected as an offline infrastructure option but not added to the browser runtime: pre-generated files already met the cross-phone consistency goal with less first-run/runtime machinery. No hosted paid TTS API was used. Runtime ships generated MP3 only, not model weights or Python environments.

## Runtime target

- selected engine: Kokoro-82M-v1.1-zh
- selected voice: zm_010 — OWNER ACCEPTED FOR TEMPORARY USE ON 2026-08-12
- runtime manifest: assets/audio/voice-manifest.json
- audio output: assets/audio/kokoro-zm-010/*.mp3
- generated MP3 inventory: 22 files, 831,390 bytes total
- format: MP3, 24 kHz, mono, 64 kbps; loudness-normalized to a -18 LUFS target

## Generation command

Create a local environment and install the official runtime dependencies:

    python -m venv .venv
    .venv\Scripts\python -m pip install "kokoro>=0.8.1" "misaki[zh]>=0.8.1" soundfile torch
    .venv\Scripts\python playable-a6r/tools/generate_static_voice.py --voice zm_010 --output .tmp-a6r-wav

Convert each WAV to its matching checked-in MP3 name with ffmpeg:

    ffmpeg -i INPUT.wav -af loudnorm=I=-18:TP=-1.5:LRA=7 -ar 24000 -ac 1 -b:a 64k OUTPUT.mp3

The generation tool reads `spokenText` from the checked-in manifest. No model is shipped in A6R and external spend was NT$0.

## Final verdict

VOICE_AUDITION = PASS FOR A6R RELEASE. `zf_001` = OWNER REJECTED. `zm_010` = COMPLETE SECOND CANDIDATE, runtime playback PASS, OWNER ACCEPTED FOR TEMPORARY USE. This does not claim that the synthetic voice is objectively superior to human recording or permanently selected for later products.

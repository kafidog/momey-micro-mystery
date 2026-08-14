"""Generate A9R's frozen operator MP3 files with the accepted Kokoro zm_010 voice."""

from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import soundfile as sf
import torch
from kokoro import KModel, KPipeline

REPO_ID = "hexgrad/Kokoro-82M-v1.1-zh"
VOICE = "zm_010"
SAMPLE_RATE = 24_000


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--speed", type=float, default=1.0)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    args.output.mkdir(parents=True, exist_ok=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = KModel(repo_id=REPO_ID).to(device).eval()
    pipeline = KPipeline(lang_code="z", repo_id=REPO_ID, model=model)

    with tempfile.TemporaryDirectory(prefix="momey-a9r-voice-") as temp_dir:
        for entry in manifest["entries"]:
            result = next(pipeline(entry["spokenText"], voice=VOICE, speed=args.speed))
            stem = Path(entry["audioFile"]).stem
            wav = Path(temp_dir) / f"{stem}.wav"
            mp3 = args.output / f"{stem}.mp3"
            sf.write(wav, result.audio, SAMPLE_RATE)
            subprocess.run([args.ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-q:a", "3", str(mp3)], check=True)
            print(f"generated {entry['id']} -> {mp3.name}")


if __name__ == "__main__":
    main()

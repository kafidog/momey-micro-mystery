"""Generate A8's new static clips with the accepted A7 Kokoro voice chain.

This is an operator-only build tool.  The browser receives only the frozen
MP3 files; it never loads Python or model weights.  The model and voice are
kept identical to A7: Kokoro-82M-v1.1-zh with zm_010.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import soundfile as sf
import torch
from kokoro import KModel, KPipeline


REPO_ID = "hexgrad/Kokoro-82M-v1.1-zh"
VOICE = "zm_010"
SAMPLE_RATE = 24_000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path(__file__).parents[1] / "assets/audio/voice-manifest.json",
    )
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--speed", type=float, default=1.0)
    parser.add_argument("--prefix", default="a8_")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    spoken = [
        entry
        for entry in manifest["entries"]
        if entry.get("audioFile")
        and entry.get("spokenText")
        and Path(entry["audioFile"]).stem.startswith(args.prefix)
    ]
    if not spoken:
        raise SystemExit("manifest has no matching A8 spoken records")
    args.output.mkdir(parents=True, exist_ok=True)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = KModel(repo_id=REPO_ID).to(device).eval()
    english = KPipeline(lang_code="a", repo_id=REPO_ID, model=False)

    def english_phonemes(text: str) -> str:
        return next(english(text)).phonemes

    pipeline = KPipeline(
        lang_code="z",
        repo_id=REPO_ID,
        model=model,
        en_callable=english_phonemes,
    )
    for entry in spoken:
        output_name = Path(entry["audioFile"]).with_suffix(".wav").name
        result = next(pipeline(entry["spokenText"], voice=VOICE, speed=args.speed))
        sf.write(args.output / output_name, result.audio, SAMPLE_RATE)
        print(f"generated {entry['id']} -> {output_name}")


if __name__ == "__main__":
    main()

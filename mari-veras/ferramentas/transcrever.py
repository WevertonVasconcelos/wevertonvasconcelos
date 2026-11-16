"""Transcreve vídeos/áudios da Mariana em português.

Uso:
    pip install faster-whisper
    python mari-veras/ferramentas/transcrever.py mari-veras/videos-brutos/*.mp4

Gera, ao lado de cada vídeo, um .txt (texto corrido) e um .srt (legenda com tempos).
O modelo vem do Hugging Face (huggingface.co precisa estar liberado na rede).
"""
import sys
from pathlib import Path

from faster_whisper import WhisperModel


def ts(seg: float) -> str:
    h, rest = divmod(int(seg * 1000), 3_600_000)
    m, rest = divmod(rest, 60_000)
    s, ms = divmod(rest, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def main(paths: list[str]) -> None:
    if not paths:
        sys.exit(__doc__)
    model = WhisperModel("small", device="cpu", compute_type="int8")
    for p in map(Path, paths):
        print(f"→ {p.name}", flush=True)
        segments, _ = model.transcribe(str(p), language="pt", vad_filter=True)
        segments = list(segments)
        p.with_suffix(".txt").write_text(
            "\n".join(s.text.strip() for s in segments) + "\n", encoding="utf-8"
        )
        srt = [
            f"{i}\n{ts(s.start)} --> {ts(s.end)}\n{s.text.strip()}\n"
            for i, s in enumerate(segments, 1)
        ]
        p.with_suffix(".srt").write_text("\n".join(srt), encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1:])

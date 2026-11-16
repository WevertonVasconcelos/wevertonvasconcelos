"""Extrai quadros dos vídeos para análise visual (jeito, gestos, enquadramento, edição).

Uso:
    python mari-veras/ferramentas/extrair_quadros.py VIDEO.mp4 [VIDEO2.mp4 ...]

Para cada vídeo, cria em mari-veras/quadros/<nome>/ (fora do git):
  - info.txt         duração, resolução, orientação, fps
  - painel_XXX.jpg   painéis 4x3 com 1 quadro a cada N segundos (visão geral barata)
  - corte_XXX.jpg    quadros nas trocas de cena (ritmo de edição)
  - cortes.txt       tempos das trocas de cena
Requer ffmpeg e ffprobe no PATH.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1] / "quadros"


def probe(video: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,r_frame_rate:format=duration", "-of", "json", str(video)],
        capture_output=True, text=True, check=True).stdout
    data = json.loads(out)
    s = data["streams"][0]
    num, den = map(int, s["r_frame_rate"].split("/"))
    return {"duracao_s": round(float(data["format"]["duration"]), 1),
            "largura": s["width"], "altura": s["height"],
            "orientacao": "vertical" if s["height"] > s["width"] else "horizontal",
            "fps": round(num / den, 2)}


def main(paths: list[str]) -> None:
    if not paths:
        sys.exit(__doc__)
    for video in map(Path, paths):
        dest = RAIZ / video.stem
        dest.mkdir(parents=True, exist_ok=True)
        info = probe(video)
        # ~24 quadros por painel-set em vídeos curtos; no máximo 1 quadro a cada 2 s
        passo = max(2, round(info["duracao_s"] / 48))
        info["segundos_entre_quadros_do_painel"] = passo
        (dest / "info.txt").write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"→ {video.name}: {info}", flush=True)

        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf",
             f"fps=1/{passo},scale=360:-2,drawtext=text='%{{pts\\:hms}}':x=6:y=6:"
             "fontsize=18:fontcolor=white:box=1:boxcolor=black@0.5,tile=4x3",
             "-q:v", "4", str(dest / "painel_%03d.jpg")], check=True)

        log = subprocess.run(
            ["ffmpeg", "-v", "info", "-y", "-i", str(video), "-vf",
             "select='gt(scene,0.35)',showinfo,scale=480:-2", "-vsync", "vfr",
             "-q:v", "4", str(dest / "corte_%03d.jpg")],
            capture_output=True, text=True).stderr
        tempos = re.findall(r"pts_time:([\d.]+)", log)
        (dest / "cortes.txt").write_text(
            f"{len(tempos)} trocas de cena\n" + "\n".join(f"{float(t):.1f}s" for t in tempos) + "\n",
            encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1:])

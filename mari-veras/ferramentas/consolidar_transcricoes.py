"""Junta todas as transcrições em um arquivo só, para subir no Projeto do Claude.ai.

Uso: python mari-veras/ferramentas/consolidar_transcricoes.py
Gera mari-veras/transcricoes-consolidadas.md a partir de mari-veras/transcricoes/*.txt.
"""
from pathlib import Path

pasta = Path(__file__).resolve().parents[1]
partes = [
    "# Transcrições consolidadas: falas reais da Mari Véras\n",
    "Gerado de `transcricoes/*.txt` por `ferramentas/consolidar_transcricoes.py`. "
    "Falas de pacientes anonimizadas e marcadas como [Paciente]. "
    "Análise do jeito de falar em `estilo-em-video.md` e `guia-de-voz.md`.\n",
]
for f in sorted((pasta / "transcricoes").glob("*.txt")):
    linhas = f.read_text(encoding="utf-8").splitlines()
    titulo = linhas[0].lstrip("# ").strip() if linhas else f.stem
    meta = [l.lstrip("# ").strip() for l in linhas[1:] if l.startswith("#")]
    corpo = [l for l in linhas[1:] if not l.startswith("#")]
    partes.append(f"\n---\n\n## {titulo}\n\n*Arquivo: `transcricoes/{f.name}`. {' '.join(meta)}*\n")
    partes.append("\n".join(corpo).strip() + "\n")
(pasta / "transcricoes-consolidadas.md").write_text("\n".join(partes), encoding="utf-8")
print("ok")

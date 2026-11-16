# Vídeo: roteiro, gravação e edição

## Como ela é em câmera
- Olha para a lente, sorriso fácil, fala ~170 palavras/min e improvisa bem a partir de tópicos.
- Mãos expressivas: indicador levantado na regra, pinça (polegar + indicador) no detalhe, mãos abertas na virada, dedos entrelaçados ao escutar.
- Nos bastidores anda e manuseia objetos (mala, insumos, laser) e fica mais solta.
- Formatos que já funcionam: educativo à mesa com simuladores; mito ou verdade; caso clínico com entrevista; bastidor (domicílio, mala, carro); pergunta-dor para a família; relato ("hoje foi um dia daqueles"); stories em sequência com frase + foto + chamada.

## Modelo de roteiro de reels (30–60 s)
```
FORMATO / PÚBLICO / DURAÇÃO (≈ palavras: 30 s = 85, 45 s = 125, 60 s = 170)
CENA: Clinical Center | mesa com simuladores | carro/caminho | casa · PLANO: médio, lapela

[0–3 s] GANCHO (literal, olhando para a lente, sem "oi, gente")
  Fala:              Palavra na tela:
[3–__ s] MEIO: 3 a 5 tópicos (ela improvisa) + 1 comparação caseira ("imagina só…")
  Gesto natural, se ajudar: (indicador) na regra · (pinça) no detalhe
[__ s] VIRADA (literal, frase curta) + meio segundo de pausa
[fim] CHAMADA: "Se ___, clica no link da bio. Agenda uma consulta comigo e a gente conversa sobre o seu caso com calma."
CAPA (até 6 palavras) · LEGENDA DO POST · REVISAR ANTES DE POSTAR
```

## Modelo de sequência de stories (4–6 telas)
1. Capa com ela: "Deixa eu contar uma coisa pra vocês" (`story_capa`).
2. Tema + fotos com leito pixelado (`story_titulo_fotos`).
3. Detalhe com seta e anotação (`story_pilha_foto`).
4. A frase que fica (`story_texto`), prova social com autorização.
5. Chamada com botão "Clica aqui e fala comigo!" (`story_cta`).

## Aula gravada e vídeos curtos de curso
- 16:9, plano médio (cintura para cima), ela no terço esquerdo, olhos no terço superior, lado direito livre para cartelas.
- De dia, janela de frente; celular no tripé na altura dos olhos a 1,2–1,5 m; câmera traseira; lapela; nada entre ela e a câmera (sem notebook); fundo claro com 2–3 objetos.
- Blocos de 1–2 min gravados separados; frases de abertura, virada e fecho literais; o resto em tópicos.
- Abertura do curso em vídeos curtos e separados: apresentação (~1 min), como funciona (~35 s, opcional), bônus (~50 s).

## Edição (padrão do perfil)
- Duração: reels de paciente 35–60 s; caso com entrevista até ~2 min.
- Cortar pausas e repetições; **não acelerar acima de 1,1×**; meio segundo de respiro depois da virada.
- **Legenda:** palavra a palavra (2–4 palavras), sans bold branca com contorno grafite, centralizada a ~58% da altura; palavra-chave em ouro `#B89A6A`.
- Cartela de virada: fundo névoa/creme com texto grafite ou Cormorant itálico.
- Música instrumental baixa (−20 dB sob a voz). Corte seco; fusão só em bastidor.

## Comandos (Claude Code, com ffmpeg)
- **Transcrever:** `python mari-veras/ferramentas/transcrever.py VIDEO.mp4` → `.txt` + `.srt` (faster-whisper).
- **Quadros para análise:** `python mari-veras/ferramentas/extrair_quadros.py VIDEO.mp4`.
- **Cortar:** `ffmpeg -ss INICIO -to FIM -i in.mp4 -c:v libx264 -crf 20 -c:a aac out.mp4` (proponha os tempos à Mari antes).
- **Vertical 9:16:** `-vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"`.
- **Legenda embutida** (precisa de ffmpeg com libass: `brew tap homebrew-ffmpeg/ffmpeg && brew install homebrew-ffmpeg/ffmpeg/ffmpeg`): quebre o `.srt` em blocos de 2–4 palavras e use
  `-vf "subtitles=leg.srt:fontsdir=<skill>/assets/fonts:force_style='FontName=Montserrat,Bold=1,FontSize=14,PrimaryColour=&H00FFFFFF,OutlineColour=&H004A4A4A,Outline=2,Shadow=1,Alignment=2,MarginV=121'"`.
- **Áudio:** `-af loudnorm=I=-16:TP=-1.5:LRA=11`.
- **Conferência:** `ffmpeg -ss 5 -i out.mp4 -frames:v 1 check.png` e olhe antes de entregar.

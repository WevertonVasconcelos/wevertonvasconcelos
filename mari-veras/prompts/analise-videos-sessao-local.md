# Prompt: análise dos vídeos da Mariana (sessão local)

Cole o bloco abaixo, inteiro, numa sessão **local** do Claude Code no computador onde estão os vídeos.

---

```text
Você vai continuar um trabalho começado em outra sessão: o assistente de marca da Enf. Mari Véras (enfermeira dermatológica, COREN-PE 528.268, pé diabético, Afogados da Ingazeira-PE). O kit já existe no repositório GitHub WevertonVasconcelos/wevertonvasconcelos, branch claude/wizardly-ritchie-fma3wu, pasta mari-veras/.

OBJETIVO
Analisar os vídeos da Mariana (reels, stories e um vídeo gravado em casa para o curso) para registrar, além do que ela FALA, COMO ela aparece e se comporta: jeito, gestos, movimentos, expressões, energia, ritmo, enquadramento, cenário, figurino, luz e estilo de edição. O resultado vai alimentar o assistente para criar roteiros que ela grave com naturalidade e para editar vídeos no estilo dela.

PASSO 0 — PREPARAR
1. Clone (ou atualize) o repositório e faça checkout da branch claude/wizardly-ritchie-fma3wu. Trabalhe e faça commits nessa branch.
2. Leia antes de começar: mari-veras/README.md, mari-veras/guia-de-voz.md, mari-veras/identidade-visual.md, mari-veras/instagram-referencia.md, mari-veras/checklist-publicacao.md e .claude/skills/mari-veras/SKILL.md.
3. Me pergunte em qual pasta do computador estão os vídeos, se eu ainda não tiver dito. Liste os arquivos com tamanho e duração antes de processar.
4. Confira se ffmpeg/ffprobe estão instalados e instale `faster-whisper` com pip. Se faltar algo, me diga o comando para instalar no meu sistema, em vez de tentar contornar.

PASSO 1 — TRANSCREVER (o que ela fala)
- Rode: python mari-veras/ferramentas/transcrever.py <vídeos>
- Gera .txt e .srt ao lado de cada vídeo. Copie só os .txt para mari-veras/transcricoes/ com nomes descritivos (ex.: reels-3-habitos-pe-diabetico.txt, curso-gravacao-casa.txt). Revise os erros óbvios de reconhecimento (termos técnicos, nomes de cidades).

PASSO 2 — EXTRAIR QUADROS (o que ela mostra)
- Rode: python mari-veras/ferramentas/extrair_quadros.py <vídeos>
- Gera em mari-veras/quadros/<vídeo>/ painéis 4x3 com o tempo em cada quadro, quadros em cada troca de cena, cortes.txt e info.txt. Essa pasta NÃO vai para o git.
- Olhe os painéis de cada vídeo (leia as imagens). Para os momentos importantes (gancho dos primeiros 3 s, gestos marcantes, chamada final), extraia quadros extras em resolução maior: ffmpeg -ss <tempo> -i <vídeo> -frames:v 1 -vf scale=720:-2 <saida>.jpg
- Cruze os quadros com o .srt: o que ela está dizendo quando faz cada gesto ou expressão.

PASSO 3 — ANALISAR E REGISTRAR
Crie mari-veras/estilo-em-video.md com, para o conjunto e com exemplos (vídeo + tempo):
1. Presença e energia: postura, ritmo de fala (palavras por minuto, a partir das transcrições e durações), tom (calmo, enérgico, acolhedor), sorriso, olhar para a câmera.
2. Gestos e movimentos: o que faz com as mãos, gestos recorrentes, se anda ou fica parada, se aponta para texto ou objetos, como abre e fecha os vídeos.
3. Expressões faciais e momentos de virada: como marca ênfase, humor, seriedade.
4. Jeito de falar: bordões reais, palavras e expressões que repete, regionalismos, como cumprimenta e se despede, vícios de linguagem a manter ou a cortar na edição, frases que já funcionam como gancho.
5. Enquadramento e câmera: vertical ou horizontal, plano (close, médio, americano), altura da câmera, selfie ou tripé, câmera parada ou em movimento.
6. Cenário e ambientes: consultório, domicílio, carro, casa; o que aparece ao fundo; o que funciona e o que atrapalha.
7. Figurino e aparência: cores e estilo de roupa, jaleco ou não, como isso conversa com a paleta da marca (creme/caramelo/marrom).
8. Luz e som: natural ou artificial, qualidade do áudio, ruídos, uso de microfone.
9. Edição: duração média, número de cortes por minuto (cortes.txt), legenda na tela (fonte, cor, posição, tamanho), texto de gancho, transições, música, efeitos, capa.
10. Formatos de conteúdo: quais tipos de vídeo existem (educativo, caso clínico, bastidor, pessoal) e a estrutura de cada um (gancho → desenvolvimento → virada → chamada).
11. O que funciona: os pontos fortes dela em câmera, para potencializar.
12. O que melhorar: sugestões práticas e gentis de gravação e edição, sem descaracterizar o jeito dela.
13. Diretrizes para o assistente: regras objetivas, por exemplo "roteiros com no máximo X palavras por bloco porque ela fala em ritmo Y", "abrir com pergunta olhando para a câmera", "legenda em Arial bold, branca, terço inferior".
14. Vídeo do curso (gravado em casa): avaliação específica de setup (luz, som, enquadramento, fundo) e lista do que ajustar antes de gravar as próximas aulas.

Registre também as visualizações que eu informar para cada vídeo, se eu passar.

PASSO 4 — ATUALIZAR O KIT
- guia-de-voz.md: acrescente uma seção "Como ela fala de verdade" com bordões e expressões reais tiradas das transcrições, e confirme ou corrija os itens marcados [INFERIDO], explicando com base em quê.
- identidade-visual.md: acrescente uma seção "Em vídeo" com o padrão de legenda, capa e enquadramento observados.
- modelos-de-conteudo.md: ajuste o modelo de roteiro de reels ao ritmo e ao jeito reais dela.
- .claude/skills/mari-veras/SKILL.md: adicione estilo-em-video.md na tabela de arquivos e ajuste o comando de legenda embutida (cor, fonte, posição) para imitar o estilo dela.
- instrucoes-projeto-claude.md: acrescente um parágrafo curto "Em vídeo" resumindo as diretrizes do item 13.
- instagram-referencia.md: se os vídeos forem os reels do perfil, ligue cada título às visualizações.

REGRAS
- Privacidade e COFEN: se aparecer paciente (rosto, nome, ferida identificável, endereço, prontuário), NÃO descreva traços que identifiquem a pessoa, NÃO copie esses quadros para lugar nenhum e sinalize no relatório os vídeos que precisam de revisão de autorização de imagem. Nada de vídeo, áudio ou quadro entra no git: só texto (.md e .txt). Antes do commit, confirme com git status que mari-veras/quadros/ e os vídeos estão fora.
- Descreva com respeito e de forma útil para criação de conteúdo. Não avalie a aparência física dela; foque em comunicação, estilo e técnica.
- Separe o que é OBSERVADO (com vídeo e tempo) do que é INTERPRETAÇÃO.
- Seja econômico: use os painéis para a visão geral e quadros em alta só onde precisar.

FINAL
1. Commit em português na branch claude/wizardly-ritchie-fma3wu e push para origin.
2. Me responda curto: quais vídeos foram analisados, os 5 traços mais marcantes da Mariana em vídeo, o que mudou no kit e quais vídeos precisam de revisão de autorização de imagem.
```

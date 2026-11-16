# Kit do assistente: Mari Véras

Tudo o que o Claude precisa para criar conteúdo com a voz, o visual e as regras da Mariana.

## Como usar

### No Claude.ai ou no app (dia a dia da Mariana)
1. Crie um **Projeto** chamado "Mari Véras".
2. Em **Instruções**, cole o conteúdo de `instrucoes-projeto-claude.md` (a partir de "## Quem você é").
3. Em **Conhecimento**, envie: `guia-de-voz.md`, `identidade-visual.md`, `estilo-em-video.md`, `checklist-publicacao.md`, `modelos-de-conteudo.md`, `instagram-referencia.md`, `contexto/projeto-mari-veras-nov2026.md`, o PDF do manual "Além do Curativo" e as transcrições de `transcricoes/`.
4. Peça do jeito que falaria com uma assistente: "faz um reels sobre unha encravada em diabético", "monta o carrossel do degrau 3", "slides da aula 1 do curso".

### No Claude Code (este repositório)
A skill `mari-veras` carrega sozinha quando o pedido é sobre a marca. Aqui dá para **editar vídeo** (cortar, verticalizar, legendar, normalizar áudio) e transcrever as gravações.

## Arquivos

| Arquivo | O que tem |
| --- | --- |
| `instrucoes-projeto-claude.md` | Instruções principais do assistente |
| `guia-de-voz.md` | Como a Mariana escreve e fala; o que agrada e desagrada |
| `identidade-visual.md` | Cores (medidas no manual), fontes, elementos, formatos |
| `checklist-publicacao.md` | Regras do COFEN e da empresa antes de postar |
| `modelos-de-conteudo.md` | Reels, carrossel, legenda, stories, slides, aula, calendário |
| `instagram-referencia.md` | Retrato do perfil em 15/11/2026 e ganchos que funcionam |
| `estilo-em-video.md` | Como ela aparece, fala e é editada em vídeo; diretrizes de roteiro, gravação e edição |
| `contexto/` | Documento-base do projeto (nov/2026) |
| `roteiros/` | Roteiros prontos para gravar (ex.: regravação da apresentação do curso, com enquadramento) |
| `transcricoes/` | Falas reais da Mariana: 11 reels, 1 bruto e o vídeo do curso |
| `ferramentas/transcrever.py` | Transcreve vídeos em `.txt` e `.srt` |
| `ferramentas/extrair_quadros.py` | Tira quadros e detecta cortes para análise visual |
| `prompts/analise-videos-sessao-local.md` | Prompt da sessão local que analisa os vídeos |

## Pendências para a Mariana validar

- [ ] Visualizações de cada reels (hipótese: "Amputação nunca acontece do nada" = 5,1 mil).
- [ ] Autorização de imagem dos vídeos listados em `estilo-em-video.md`, seção 16.
- [ ] Cor de destaque: terracota dos vídeos ou caramelo do manual.
- [ ] Posição do COREN-PE sobre antes e depois e sobre a Res. COFEN 787/2025.
- [ ] Identidade visual própria da Mari Véras (hoje usamos a do manual como base).
- [ ] Ajustes no manual "Além do Curativo": "FOUNDER VERAS VASCONCELOS" sem acento na capa; palavras quebradas nos cartões ("Implementaç/ão" na p. 2, "Acompanham/ento" na p. 17); a assinatura final aponta para @veras_vasconcelos (atualizar para o perfil novo).

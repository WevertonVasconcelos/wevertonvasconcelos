# Kit do assistente: Mari Véras

Tudo o que o Claude precisa para criar conteúdo com a voz, o visual e as regras da Mariana.

## Como usar

### Montar o projeto no Claude.ai (chat)
1. Crie um **Projeto** chamado "Mari Véras".
2. Em **Instruções**, cole o conteúdo de `instrucoes-projeto-claude.md` a partir de "Você é o assistente de marca…" (o comentário do topo não precisa ir).
3. Em **Conhecimento**, envie estes arquivos (em ordem de importância):

| # | Arquivo | Para quê |
| --- | --- | --- |
| 1 | `contexto-atual.md` | Quem ela é, negócio, produtos, regras (nov/2026) |
| 2 | `guia-de-voz.md` | Como ela escreve e fala |
| 3 | `exemplos-de-referencia.md` | Exemplos reais comentados + contraexemplo |
| 4 | `checklist-publicacao.md` | Regras do COFEN antes de postar |
| 5 | `modelos-de-conteudo.md` | Estruturas de reels, carrossel, legenda, stories, aula |
| 6 | `estilo-em-video.md` | Como ela aparece, fala e é editada em vídeo |
| 7 | `identidade-visual.md` | Cores, fontes, elementos, formatos |
| 8 | `instagram-referencia.md` | Perfil, ganchos e números |
| 9 | `transcricoes-consolidadas.md` | Todas as falas reais num arquivo só |
| 10 | `decisoes-e-pendencias.md` | O que está decidido e o que falta |
| 11 | `roteiros/curso-apresentacao-regravacao.md` | Exemplo de roteiro longo no formato aprovado |
| 12 | `contexto/manual-consultoria-alem-do-curativo.pdf` | Manual da consultoria (base do bônus) |

Não precisa subir `contexto/projeto-mari-veras-nov2026.md` (já está dentro de `contexto-atual.md`), nem a pasta `transcricoes/` (já está em `transcricoes-consolidadas.md`).

4. Peça do jeito que falaria com uma assistente: "faz um reels sobre unha encravada em diabético", "monta o carrossel do degrau 3", "slides da aula 1 do curso".

### No Claude Code (este repositório)
A skill `mari-veras` carrega sozinha quando o pedido é sobre a marca. Aqui dá para **editar vídeo** (cortar, verticalizar, legendar, normalizar áudio), transcrever gravações e manter os arquivos do kit em dia.

### Manter os dois sincronizados
- **O repositório é a fonte da verdade.** O Projeto no Claude.ai recebe cópias dos arquivos.
- Quando uma conversa no Projeto decidir algo, ele termina com um bloco **"Registrar no kit:"**. Cole esse bloco numa sessão do Claude Code, que atualiza os arquivos, faz o commit e diz quais arquivos trocar no Projeto.
- Depois de mudar transcrições, rode `python mari-veras/ferramentas/consolidar_transcricoes.py` para gerar de novo o `transcricoes-consolidadas.md`.

## Arquivos

| Arquivo | O que tem |
| --- | --- |
| `instrucoes-projeto-claude.md` | Instruções principais do assistente (Projeto no Claude.ai e Claude Code) |
| `contexto-atual.md` | Retrato consolidado de nov/2026: Mariana, perfil, empresa, produtos, regras |
| `exemplos-de-referencia.md` | Exemplos reais comentados da voz dela + contraexemplo |
| `decisoes-e-pendencias.md` | Registro vivo do que foi decidido e do que falta |
| `transcricoes-consolidadas.md` | Todas as transcrições num arquivo só (gerado) |
| `guia-de-voz.md` | Como a Mariana escreve e fala; o que agrada e desagrada |
| `identidade-visual.md` | Cores (medidas no manual), fontes, elementos, formatos |
| `checklist-publicacao.md` | Regras do COFEN e da empresa antes de postar |
| `modelos-de-conteudo.md` | Reels, carrossel, legenda, stories, slides, aula, calendário |
| `instagram-referencia.md` | Retrato do perfil em 15/11/2026 e ganchos que funcionam |
| `estilo-em-video.md` | Como ela aparece, fala e é editada em vídeo; diretrizes de roteiro, gravação e edição |
| `contexto/` | Documento-base original do projeto (nov/2026) e PDF do manual da consultoria |
| `roteiros/` | Roteiros prontos para gravar: vídeos curtos de abertura do curso (apresentação, como funciona, bônus), com enquadramento |
| `transcricoes/` | Falas reais da Mariana: 11 reels, 1 bruto e o vídeo do curso |
| `ferramentas/transcrever.py` | Transcreve vídeos em `.txt` e `.srt` |
| `ferramentas/extrair_quadros.py` | Tira quadros e detecta cortes para análise visual |
| `ferramentas/consolidar_transcricoes.py` | Gera `transcricoes-consolidadas.md` |
| `prompts/analise-videos-sessao-local.md` | Prompt da sessão local que analisa os vídeos |

## Pendências

Estão em `decisoes-e-pendencias.md`.

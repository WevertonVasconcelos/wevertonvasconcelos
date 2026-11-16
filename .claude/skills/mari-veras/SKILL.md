---
name: mari-veras
description: Marca pessoal da Enf. Mari Véras (enfermeira dermatológica, COREN-PE 528.268, feridas e pé diabético, Afogados da Ingazeira-PE, @mariveras.enf). Use SEMPRE que Weverton ou Mariana pedirem conteúdo com o nome, a voz ou o visual dela — posts, carrossel, stories, capa, legenda, roteiro de reels ou de aula, slides de curso ou consultoria, infográfico, e-book, material educativo em PDF, calendário editorial, ideias de pauta ou edição de vídeo — e também para qualquer CURSO, MÓDULO ou AULA para profissionais (técnicos e enfermeiros), como o curso de bordas da ferida e a consultoria "Além do Curativo". Dispare com "no estilo da Mari", "com a cara da Mari", "pro perfil dela", "pro curso", "faz um story/carrossel/reels", "monta os slides da aula". NÃO use para documentos burocráticos da empresa (POP, TCLE, regimento, contrato, ficha): esses continuam na skill documentos-institucionais-veras, com a marca Véras Vasconcelos.
---

# Mari Véras — marca pessoal, conteúdo e cursos

A Mari Véras é a **pessoa e a autoridade**: conteúdo, educação, cursos e consultoria. O nome dela é o que atrai paciente e aluno. A **Véras Vasconcelos** continua sendo a base jurídica e financeira (CNPJ, documentos institucionais, contratos) e a empresa que presta o atendimento. Esta skill cuida de tudo o que leva o nome dela; a burocracia fica com `documentos-institucionais-veras`.

O visual e a voz **não devem ser reinventados**: estão nas bibliotecas `assets/mvarte.py` (imagens e PDF) e `assets/mvslides.js` (PPTX) e nas referências abaixo. O trabalho é escrever bem o **conteúdo** e montar com os componentes prontos.

## Antes de criar, leia o que a tarefa pede

| Arquivo | Quando |
| --- | --- |
| `references/perfil.md` | Sempre: quem ela é, públicos, ofertas, para onde vai cada chamada |
| `references/voz.md` | Todo texto (legenda, roteiro, slide, post) |
| `references/cofen.md` | Toda peça pública e todo material de curso |
| `references/visual.md` | Qualquer peça visual |
| `references/video.md` | Roteiro de reels/stories/aula gravada e edição de vídeo |
| `references/cursos.md` | Curso, módulo, aula, slides, NotebookLM, roteiro de aula |

## Regras que valem para tudo

1. **Primeiro a verdade, depois o bonito.** Nada de promessa de resultado ("cura", "em X dias", "garantido"), nada de "fature 10k". Caso clínico é contado como processo.
2. **Imagem clínica:** só com autorização escrita, **leito da ferida pixelado** (`mv.pixelar` ou `pixelar_centro`), sem rosto, nome, tatuagem, casa ou prontuário do paciente.
3. **Assinatura em divulgação:** "Enf. Mari Véras · Enfermeira Dermatológica · COREN-PE 528.268". Nunca "dermatologista".
4. **Anti-alucinação:** não invente número, estudo, norma ou dosimetria. O conteúdo clínico vem das fontes fornecidas ou é marcado **[CONFERIR]**. Normas do COFEN sobre feridas: confirmar com o COREN-PE.
5. **Tempo da Mari é o recurso mais escasso.** Entregue pronto para usar; em planos, diga de onde sai o tempo (gravação em lote, roteiro pronto, reaproveitamento).
6. **Fale com a Mari de forma direta e informal.** Comece pela entrega.
7. Toda peça pública termina com **"Revisar antes de postar:"** listando o que ela precisa conferir (ou "nada a revisar").

## Fluxo por tipo de entrega

### Stories, posts, carrossel (PNG)
1. Escreva o texto na voz dela (`references/voz.md`): frases curtas, uma ideia por tela.
2. Monte com `assets/mvarte.py` (Pillow; `pip install pillow` se faltar). Modelos prontos: `story_capa`, `story_titulo_fotos`, `story_pilha_foto`, `story_texto`, `story_cta`, `carrossel`. Peças livres: `novo`, `texto`, `pilha`, `rotulo`, `foto`, `grade_fotos`, `pixelar`, `seta`, `botao`, `assinatura`. Exemplo completo: `examples/exemplo_stories.py`.
3. Numa sequência de stories, use os fundos em ordem `mv.SEQUENCIA` (branco → névoa → cinza), como ela já faz.
4. **QA:** gere `mv.folha_contato([...])`, olhe a imagem e corrija sobreposição, corte de texto, contraste e foto sem pixelar. Só então entregue.

### Infográfico, material educativo, e-book curto (PNG/PDF)
`mv.infografico(titulo, sub, blocos, rodape_fonte, frase=...)` gera uma página A4; várias páginas viram PDF com `mv.salvar_pdf([...])`. Fonte sempre citada no rodapé ou **[CONFERIR]**.

### Slides de aula, curso, consultoria (PPTX)
1. Siga `references/cursos.md` (briefing → fontes → estrutura aprovada → slides).
2. Gere com `assets/mvslides.js` (`npm install pptxgenjs`). Tipos: `capaCurso`, `capaModulo`, `objetivos`, `conteudo`, `duasColunas`, `tabela`, `fluxo`, `alerta`, `caso`, `imagem`, `frase`, `resumo`, `final`. Exemplo: `examples/exemplo_aula.js`.
3. **QA:** converta para PDF/imagem (LibreOffice `soffice --headless --convert-to pdf` + `pdftoppm`, ou Keynote) e confira capa, 2 slides de conteúdo, tabela, caso e final antes de entregar.
4. Avise: as fontes (Oswald, Montserrat, Cormorant Garamond) estão em `assets/fonts/`; instale no computador para o PowerPoint mostrar certo. No Google Slides elas já existem.

### Roteiros, legendas, calendário
Texto direto na conversa, nos modelos de `references/video.md` e `references/voz.md`. Roteiro de reels para paciente: até 130 palavras, gancho e virada literais, meio em tópicos.

### Edição de vídeo (só no Claude Code, com ffmpeg)
Comandos em `references/video.md`. Nunca publique nem envie vídeo para fora sem a Mari pedir.

## Saída

- Salve em `/mnt/user-data/outputs/` quando existir (Claude.ai); senão, numa pasta `saida/` ao lado do trabalho.
- Nome do arquivo descritivo: `story_bordas_01.png`, `carrossel_sinais-da-borda.pdf`, `curso-bordas_modulo-01.pptx`.
- Entregue com `present_files` (Claude.ai) ou diga o caminho.

## Fronteira com as outras skills

| Pedido | Skill |
| --- | --- |
| Post, story, reels, legenda, carrossel, infográfico, e-book, slides de curso, aula, consultoria, material educativo | **mari-veras** (esta) |
| POP, TCLE, regimento, normas e rotinas, protocolo interno, contrato, ficha, formulário da empresa | `documentos-institucionais-veras` |
| Treinamento interno da equipe da clínica com marca da empresa | `documentos-institucionais-veras` (ou esta, se for virar curso dela) |

## No repositório (Claude Code)

O kit completo é a fonte da verdade e tem mais detalhe que as referências desta skill:

| Arquivo | Quando ler |
| --- | --- |
| `mari-veras/instrucoes-projeto-claude.md` | Papel, voz, regras e formatos (o mesmo texto do Projeto no Claude.ai) |
| `mari-veras/contexto-atual.md` | Negócio, produtos, perfil, regras (nov/2026) |
| `mari-veras/exemplos-de-referencia.md` | Calibrar o tom com exemplos reais |
| `mari-veras/decisoes-e-pendencias.md` | O que já foi decidido e o que falta |
| `mari-veras/estilo-em-video.md` | Análise completa dos vídeos dela |
| `mari-veras/transcricoes/` e `transcricoes-consolidadas.md` | Falas reais dela |
| `mari-veras/roteiros/` | Roteiros prontos (ex.: abertura do curso) |

**Quando chegar um bloco "Registrar no kit:"** (vindo do Projeto no Claude.ai): aplique cada item no arquivo indicado, registre a decisão em `mari-veras/decisoes-e-pendencias.md` com a data, rode `python mari-veras/ferramentas/consolidar_transcricoes.py` se mexeu em transcrições, faça commit e diga quais arquivos o Weverton precisa trocar no Projeto. Se a mudança for na skill, gere de novo o `mari-veras.zip` para enviar no Claude.ai.

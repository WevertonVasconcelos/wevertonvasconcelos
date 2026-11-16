# Cursos, módulos e aulas (marca Mari Véras)

Os cursos e materiais para profissionais agora saem **com o nome dela** (antes, rodapé "Véras Vasconcelos"). Primeiro curso: **Tratamento das bordas de feridas em membros inferiores** — 8 módulos, 10–12 h, ~80 slides, fontes Claude + Perplexity + GPT (maio/2026).

## Princípio
**Organizar e estruturar, não inventar.** O conteúdo clínico vem das fontes fornecidas. A skill hierarquiza, escreve na voz dela e monta os slides; nunca acrescenta afirmação clínica sem base.

## Fluxo
1. **Briefing** (confirme numa mensagem só):
   | Variável | Opções |
   | --- | --- |
   | Público | técnico / enfermeiro / ambos |
   | Nível | introdutório / intermediário / avançado |
   | Saída | PPTX (padrão) / roteiro de aula / PDF de apoio / NotebookLM |
   | Carga horária e tema | definidos pela Mari ou pelo Weverton |
2. **Leitura diagnóstica das fontes:** blocos temáticos; divergências marcadas como
   `[!DIVERGÊNCIA — Fonte A: "x" | Fonte B: "y"]` (nunca resolver sozinho); lacunas como `[?LACUNA: ...]`.
3. **Proposta de estrutura** (módulos → aulas → tópicos) para aprovação antes de gerar.
4. **Slides** com `assets/mvslides.js`. QA visual obrigatório.
5. **Roteiro de aula** e **materiais de apoio** (infográfico/PDF com `mvarte.py`).

## Mapa de slides (mvslides.js)
| Momento da aula | Função |
| --- | --- |
| Capa do curso | `capaCurso({titulo, sub, foto})` (foto dela à direita) |
| Abertura de módulo | `capaModulo({numero, titulo, sub})` |
| Objetivos ("Ao final desta aula, você vai:") | `objetivos({itens})` (máx. 5) |
| Conceito | `conteudo({titulo, itens, rotulo, foto, legenda})` (máx. 5 tópicos; `**destaque**`) |
| Comparação | `duasColunas` ou `tabela` |
| Passo a passo | `fluxo({etapas: [{titulo, texto}]})` (3–5) |
| Erros comuns | `alerta({itens})` |
| Caso clínico (sem identificar paciente) | `caso({situacao, raciocinio, conduta, foto})` |
| Imagem clínica (leito pixelado) | `imagem({foto, legenda})` |
| Frase que fica | `frase({frase, autor})` |
| Fechamento | `resumo({pontos, tarefa})` |
| Último slide | `final({frase, chamada, contato})` |

Regras: um conceito por slide; no máximo 5 tópicos; cada aula termina com **resumo + tarefa**; rodapé automático "MARI VÉRAS · ENFERMEIRA DERMATOLÓGICA" + curso · módulo · nº.

## Regras pptxgenjs
- Cores **sem "#"**; não reutilize objetos de opções entre chamadas (use funções que retornam objetos novos).
- Bullets com `bullet` + `breakLine`, nunca "•" digitado. `valign: "top"` em caixas com lista.
- Fontes referenciadas: Oswald, Montserrat, Cormorant Garamond (instalar no PC; Google Slides já tem).

## QA dos slides
```bash
soffice --headless --convert-to pdf curso.pptx && pdftoppm -jpeg -r 80 curso.pdf slide
```
(ou Keynote: exportar como imagens). Olhe capa, 2 de conteúdo, tabela, caso e final. Corrija texto estourado, sobreposição e contraste.

## Roteiro de aula gravada
```
[ABERTURA 30–60 s] por que isso importa na prática (frase literal dela)
[DESENVOLVIMENTO blocos de 2–4 min] conceito → explicação → exemplo → fixação   [SLIDE X]
[NA PRÁTICA] caso sem identificar paciente                                       [EXEMPLO CLÍNICO]
[ERROS COMUNS 1–2 min]
[RECAPITULAÇÃO 1 min] 3 frases simples + tarefa
[ENCERRAMENTO 30 s] gancho para a próxima aula
```
Marcações: `[FALA]` `[SLIDE X]` `[PAUSA DIDÁTICA]` `[EXEMPLO CLÍNICO]`. Gravação: ver `video.md`.

## Linguagem por público
| Público | Linguagem | Foco |
| --- | --- | --- |
| Técnico | Direta, termo técnico explicado na 1ª vez | Etapas, sinais de alerta, quando chamar o enfermeiro |
| Enfermeiro | Técnica, com embasamento | Fisiopatologia, classificação, conduta, registro |
| Ambos | Intermediária | Os dois, deixando claro o que é privativo do enfermeiro |

## Prompt para NotebookLM (rascunho de conteúdo, opcional)
O NotebookLM gera slides genéricos, sem a identidade dela: serve para a Mari revisar o conteúdo antes do PPTX final.
```
Você é um especialista em educação para profissionais de enfermagem e vai preparar material da Enf. Mari Véras (enfermeira dermatológica).
TEMA: [título] · PÚBLICO: [técnico/enfermeiro/ambos] · NÍVEL: [...] · CARGA HORÁRIA: [...]
ESTRUTURA: [módulos e tópicos aprovados]
SLIDES: um conceito por slide; no máximo 5 pontos; objetivos no formato "Ao final desta aula, você vai..."; caso clínico = situação → raciocínio → conduta; último slide = ponto-chave + gancho para a próxima aula.
LINGUAGEM: frases curtas, "você", tom de colega que ensina; explicar termo técnico na 1ª vez.
RESTRIÇÕES: usar só as fontes deste notebook; marcar [VERIFICAR] o que não tiver base; não identificar pacientes.
```

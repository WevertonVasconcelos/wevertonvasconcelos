# Visual da Mari Véras

**Base:** os stories que ela publicou em 13/11/2026 (fundo neutro, título condensado grafite, texto leve, setas à mão, ferida pixelada) + o **ouro da família Véras** como destaque. Parente visual da Véras Vasconcelos (mesmo ouro e creme), mas com cara própria: mais limpo, editorial, de rede social.

## Paleta (tokens em `mvarte.C` e `mvslides.C`)

| Papel | Hex | Uso |
| --- | --- | --- |
| Branco | `#FFFFFF` | Fundo 1 |
| Névoa | `#EDEDEB` | Fundo 2 |
| Cinza | `#D6D6D4` | Fundo 3 (stories de chamada) |
| Grafite | `#4A4A4A` | Títulos condensados |
| Texto | `#6B6B6B` | Texto corrido leve |
| Carvão | `#2D2D2D` | Texto forte, setas, frase de efeito |
| **Ouro** | `#B89A6A` | Destaque: 1 palavra, fio, numeral, bolinha |
| Ouro escuro | `#8C7044` | Rótulos, @, destaque sobre fundo claro |
| Creme | `#F5F0EB` | Cartões, caixas |
| Taupe | `#C8B49A` | Bordas finas, divisores |

Regras: fundo sempre claro e neutro; **ouro só como acento** (nunca parágrafo inteiro, nunca fundo de tela cheia); nada de neon, azul hospitalar ou vermelho de alerta (o rosado `#B87070` só na barra de "erros comuns" dos slides).

**Sequência de stories:** branco → névoa → cinza (`mv.SEQUENCIA`), como na série de 13/11.

## Tipografia (arquivos em `assets/fonts/`, licença OFL)

| Uso | Fonte | Peso |
| --- | --- | --- |
| Títulos, chamadas, anotação de seta | **Oswald** (condensada) | 600–700 |
| Texto corrido, legenda, subtítulo | **Montserrat** | 300 (leve) a 500 |
| Ênfase em pilha ("É muito") | Montserrat Italic | 300 |
| Rótulo caixa-alta espaçada ("CUIDE DA BORDA DA FERIDA") | Montserrat | 300–600, espaçamento largo |
| Frase de efeito, citação, fala de paciente | **Cormorant Garamond Italic** | 500 |

No Canva: Oswald, Montserrat e Cormorant Garamond existem. Alternativas: Anton/League Gothic (título), Josefin Sans (rótulo).

## Elementos da linguagem dela
- **Pilha de pesos misturados:** "*É muito* / importante / **cuidar**" (`mv.pilha`).
- **Seta desenhada à mão** + anotação condensada ("da perilesão e da borda da ferida", "ESSE AQUI") (`mv.seta`).
- **Grade de fotos** antes → durante → depois, cantos arredondados, **leito pixelado** (`mv.grade_fotos(..., pixelar_centro=(l, a))`).
- **Faixa branca com frase vertical** ao lado da foto dela ("Deixa eu contar uma coisa pra vocês") (`mv.story_capa`).
- **Botão de link** "Clica aqui e fala comigo!" (`mv.botao`).
- **Print de mensagem/áudio** de paciente como prova (sem nome nem foto, com autorização).
- **Foto profissional dela**: à mesa, notebook, caderno, estante de livros, roupa creme/off-white com detalhes dourados, sorriso. É a foto padrão de capa e chamada.
- **Assinatura** no rodapé: "MARI VÉRAS · ENFERMEIRA DERMATOLÓGICA · COREN-PE 528.268" + @mariveras.enf em ouro escuro.

## Formatos

| Peça | Tamanho | Função |
| --- | --- | --- |
| Story | 1080×1920 | `novo("story")` e `story_*` |
| Post / carrossel | 1080×1350 (4:5) | `carrossel([...])` |
| Quadrado | 1080×1080 | `novo("quadrado")` |
| Infográfico / PDF | A4 1240×1754 (150 dpi) | `infografico(...)`, `salvar_pdf` |
| Slides | 16:9 (13,33×7,5 pol.) | `mvslides.js` |
| Capa de reels | 1080×1920, título na área central 1080×1350 | `novo("story")` |

Margens: 90 px em post/A4, 110 px em story. Texto nunca a menos de 150 px do topo/rodapé no story (área da interface do Instagram).

## Fotos
- Dela: luz natural, fundo claro, roupa creme/off-white/mostarda com dourado. Centralizar o rosto no terço superior.
- Clínicas: sempre com autorização; **pixelar o leito**; mostrar a borda quando o tema for borda; nunca rosto/identificação do paciente.
- Sem foto disponível? Use cartão creme com frase ou ícone simples; **nunca** imagem genérica de banco com outra pessoa como se fosse ela.

## Vídeo (resumo; detalhes em `video.md`)
Legenda palavra a palavra, sans bold branca com contorno grafite, no meio da tela; palavra-chave em ouro. Capa em Oswald grafite ou Cormorant itálico sobre fundo neutro.

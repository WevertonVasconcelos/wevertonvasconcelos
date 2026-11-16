"""
Exemplo completo: sequência de stories no estilo de nov/2026 + carrossel + infográfico em PDF.

Rodar:  python exemplo_stories.py FOTO_DA_MARI.jpg FOTO1.jpg FOTO2.jpg FOTO3.jpg [pasta_saida]
As fotos clínicas são pixeladas no leito automaticamente. Use só imagens com autorização.
O texto clínico é ILUSTRATIVO: em peça real, vem das fontes e passa pela Mari.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets"))
import mvarte as mv  # noqa: E402

mari, f1, f2, f3 = sys.argv[1:5]
saida = sys.argv[5] if len(sys.argv) > 5 else "saida"

# 1) Sequência de stories (fundos branco → névoa → cinza)
stories = [
    mv.story_capa(mari, "Deixa eu contar uma coisa pra vocês"),
    mv.story_titulo_fotos("Seja ela com hiperqueratose, epíbole, maceração, descolamento...",
                          "Cuide da borda da ferida", [f1, f2, f3]),
    mv.story_pilha_foto([("É muito", "italico", 72), ("importante", "leve", 56), ("cuidar", "titulo_forte", 104)],
                        f2, "da perilesão e da borda da ferida"),
    mv.story_texto("As bordas sempre **revelam** o que tá errado na lesão", fundo=mv.SEQUENCIA[1],
                   subtitulo="E olha esse resultado só com a orientação certa."),
    mv.story_cta(mari),
]
for i, s in enumerate(stories, 1):
    mv.salvar(s, f"{saida}/story_bordas_{i:02d}.png")

# 2) Carrossel 4:5 para profissionais
slides = mv.carrossel([
    {"tipo": "capa", "titulo": "A borda da ferida está te dando um recado", "sub": "Além do curativo", "foto": mari},
    {"tipo": "texto", "rotulo": "Sinal 01", "titulo": "Borda **enrolada** para dentro",
     "corpo": "É a epíbole: a borda dobra e para de avançar. A ferida estaciona, mesmo com o curativo certo no leito."},
    {"tipo": "lista", "titulo": "O que observar a cada troca",
     "itens": ["Cor e espessura da borda", "Umidade da pele ao redor", "Se a borda está aderida ou descolada"]},
    {"tipo": "frase", "frase": "A borda comunica o erro."},
    {"tipo": "cta", "titulo": "Quer aprender a ler a borda da ferida?", "botao": "Link do curso na bio"},
], fundo="sequencia")
for i, s in enumerate(slides, 1):
    mv.salvar(s, f"{saida}/carrossel_borda_{i:02d}.png")
mv.salvar_pdf(slides, f"{saida}/carrossel_borda.pdf")

# 3) Infográfico A4 em PDF
inf = mv.infografico(
    "Borda da ferida: o que ela está te dizendo",
    "Guia rápido para técnicos e enfermeiros. Material educativo, não substitui avaliação.",
    [{"titulo": "Hiperqueratose", "texto": "Pele grossa e endurecida na borda. Sinal de pressão ou atrito contínuo."},
     {"titulo": "Epíbole", "texto": "Borda enrolada para dentro. A epitelização para de avançar."},
     {"titulo": "Maceração", "texto": "Pele esbranquiçada e amolecida. Excesso de umidade ao redor."},
     {"titulo": "Descolamento", "texto": "Borda solta do leito. Pode esconder túnel ou espaço morto."}],
    rodape_fonte="[CONFERIR com o material do curso]",
    frase="A borda comunica o erro. Olhe ao redor antes de escolher a cobertura.")
mv.salvar_pdf([inf], f"{saida}/infografico_borda.pdf")

# 4) QA: folha de contato para conferir tudo de uma vez
mv.salvar(mv.folha_contato(stories + slides, colunas=5, largura=300), f"{saida}/_conferencia.png")
print("OK", saida)

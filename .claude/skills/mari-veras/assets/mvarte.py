"""
mvarte.py — Peças visuais da marca Mari Véras (stories, posts, carrossel, infográfico, PDF).

Recria a linguagem dos stories de nov/2026: fundo neutro (branco → névoa → cinza),
título condensado grafite (Oswald), texto leve (Montserrat), frase de efeito em
Cormorant itálico, ouro da família Véras como único destaque, setas à mão,
ferida sempre com o leito pixelado e botão "Clica aqui e fala comigo!".

Uso rápido:
    import sys; sys.path.insert(0, "<pasta da skill>/assets")
    import mvarte as mv
    img = mv.novo("story", mv.C.branco)
    mv.texto(img, "As bordas sempre **revelam** o que tá errado", (90, 300, 900, 300), estilo="leve", tam=58)
    mv.salvar(img, "saida/story1.png")

Só depende de Pillow. As fontes estão em assets/fonts (licença OFL).
"""
from __future__ import annotations

import math
import os
import re
from functools import lru_cache

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTES = os.path.join(AQUI, "fonts")


# ---------------------------------------------------------------- TOKENS
class C:
    branco = "#FFFFFF"
    nevoa = "#EDEDEB"        # fundo 2 da sequência de stories
    cinza = "#D6D6D4"        # fundo 3 da sequência
    cinzaMedio = "#BDBDBB"   # fundo de foto/placeholder
    grafite = "#4A4A4A"      # títulos condensados
    texto = "#6B6B6B"        # texto leve
    carvao = "#2D2D2D"       # texto forte, setas
    ouro = "#B89A6A"         # destaque (1 palavra, fio, selo)
    ouroEscuro = "#8C7044"
    creme = "#F5F0EB"        # cartões, caixas
    taupe = "#C8B49A"        # bordas finas


SEQUENCIA = [C.branco, C.nevoa, C.cinza]  # fundos em sequência numa série de stories

FORMATOS = {
    "story": (1080, 1920),       # 9:16
    "post": (1080, 1350),        # 4:5 (carrossel e feed)
    "quadrado": (1080, 1080),
    "a4": (1240, 1754),          # A4 a 150 dpi (infográfico, PDF)
    "slide": (1920, 1080),
}

ASSINATURA = "MARI VÉRAS · ENFERMEIRA DERMATOLÓGICA · COREN-PE 528.268"
ARROBA = "@mariveras.enf"

# estilo -> (arquivo, peso)
ESTILOS = {
    "titulo": ("Oswald.ttf", 600),        # condensado grafite (stories)
    "titulo_forte": ("Oswald.ttf", 700),
    "leve": ("Montserrat.ttf", 300),      # texto corrido leve
    "normal": ("Montserrat.ttf", 400),
    "medio": ("Montserrat.ttf", 500),
    "forte": ("Montserrat.ttf", 700),
    "italico": ("Montserrat-Italic.ttf", 300),
    "efeito": ("Cormorant-Italic.ttf", 500),   # frase de efeito
    "serifa": ("Cormorant.ttf", 600),
    "rotulo": ("Montserrat.ttf", 600),    # caixa-alta espaçada
}


@lru_cache(maxsize=256)
def fonte(estilo: str, tam: int) -> ImageFont.FreeTypeFont:
    arq, peso = ESTILOS[estilo]
    f = ImageFont.truetype(os.path.join(FONTES, arq), int(tam))
    try:
        f.set_variation_by_axes([peso])
    except Exception:
        pass
    return f


# ---------------------------------------------------------------- BASE
def novo(formato: str = "story", fundo: str = C.branco) -> Image.Image:
    return Image.new("RGB", FORMATOS[formato], fundo)


def salvar(img: Image.Image, caminho: str) -> str:
    os.makedirs(os.path.dirname(os.path.abspath(caminho)), exist_ok=True)
    img.save(caminho, quality=95)
    return caminho


def salvar_pdf(paginas: list[Image.Image], caminho: str, dpi: int = 150) -> str:
    os.makedirs(os.path.dirname(os.path.abspath(caminho)), exist_ok=True)
    pgs = [p.convert("RGB") for p in paginas]
    pgs[0].save(caminho, save_all=True, append_images=pgs[1:], resolution=dpi)
    return caminho


# ---------------------------------------------------------------- TEXTO
def _tokens(texto: str, estilo: str, destaque: str):
    """'**x**' = destaque (cor ouro + estilo forte do mesmo grupo). Quebra linha com \\n."""
    out = []
    for parte in re.split(r"(\*\*[^*]+\*\*|\n)", texto):
        if not parte:
            continue
        if parte == "\n":
            out.append(("\n", estilo, False))
        elif parte.startswith("**"):
            for w in parte[2:-2].split():
                out.append((w, destaque, True))
        else:
            for w in parte.split():
                out.append((w, estilo, False))
    return out


def medir(texto: str, estilo: str, tam: int) -> float:
    return fonte(estilo, tam).getlength(texto)


def texto(img, conteudo: str, caixa, estilo="leve", tam=56, cor=C.texto,
          destaque_estilo=None, cor_destaque=C.ouro, alinhar="esquerda",
          entrelinha=1.25, valinhar="topo", sombra=False, desenhar=True):
    """Escreve texto com quebra automática dentro de caixa=(x, y, largura, altura).
    Trechos entre **asteriscos** saem em destaque. Retorna a altura usada
    (com folga para as descendentes). desenhar=False só mede."""
    x, y, L, A = caixa
    if destaque_estilo is None:
        destaque_estilo = {"leve": "forte", "normal": "forte", "medio": "forte",
                           "titulo": "titulo_forte", "efeito": "efeito",
                           "italico": "forte"}.get(estilo, estilo)
    d = ImageDraw.Draw(img)
    linhas, atual, larg = [], [], 0.0
    esp = fonte(estilo, tam).getlength(" ")
    for w, est, dest in _tokens(conteudo, estilo, destaque_estilo):
        if w == "\n":
            linhas.append(atual); atual, larg = [], 0.0; continue
        wl = fonte(est, tam).getlength(w)
        if atual and larg + esp + wl > L:
            linhas.append(atual); atual, larg = [], 0.0
        atual.append((w, est, dest, wl)); larg += (esp if len(atual) > 1 else 0) + wl
    if atual:
        linhas.append(atual)
    alt_linha = tam * entrelinha
    total = alt_linha * len(linhas)
    if not desenhar:
        return total + tam * 0.3
    cy = y if valinhar == "topo" else (y + (A - total) / 2 if valinhar == "meio" else y + A - total)
    for ln in linhas:
        lw = sum(t[3] for t in ln) + esp * max(len(ln) - 1, 0)
        cx = x if alinhar == "esquerda" else (x + (L - lw) / 2 if alinhar == "centro" else x + L - lw)
        for w, est, dest, wl in ln:
            c = cor_destaque if dest else cor
            if sombra:
                d.text((cx + 2, cy + 3), w, font=fonte(est, tam), fill=(0, 0, 0, 90))
            d.text((cx, cy), w, font=fonte(est, tam), fill=c)
            cx += wl + esp
        cy += alt_linha
    return total + tam * 0.3


def altura(conteudo, largura, estilo="leve", tam=56, entrelinha=1.25):
    """Mede a altura que um texto ocupa numa largura, sem desenhar."""
    return texto(Image.new("RGB", (8, 8)), conteudo, (0, 0, largura, 10_000), estilo=estilo, tam=tam,
                 entrelinha=entrelinha, desenhar=False)


def pilha(img, linhas, x, y, alinhar="esquerda", largura=None, cor=C.grafite):
    """Palavras empilhadas com pesos misturados, como 'É muito / importante / CUIDAR'.
    linhas = [("É muito", "italico", 64), ("importante", "leve", 52), ("cuidar", "titulo_forte", 96)]"""
    cy = y
    for t, est, tam, *resto in linhas:
        c = resto[0] if resto else cor
        f = fonte(est, tam)
        w = f.getlength(t)
        cx = x if alinhar == "esquerda" else (x + (largura - w) / 2)
        ImageDraw.Draw(img).text((cx, cy), t, font=f, fill=c)
        cy += tam * 1.02
    return cy - y


def rotulo(img, conteudo: str, x, y, tam=26, cor=C.texto, espaco=0.18, estilo="rotulo", alinhar="esquerda", largura=None):
    """Caixa-alta espaçada (ex.: 'CUIDE DA BORDA DA FERIDA')."""
    f = fonte(estilo, tam)
    t = conteudo.upper()
    track = tam * espaco
    w = sum(f.getlength(ch) for ch in t) + track * (len(t) - 1)
    cx = x if alinhar == "esquerda" else x + (largura - w) / 2
    d = ImageDraw.Draw(img)
    for ch in t:
        d.text((cx, y), ch, font=f, fill=cor)
        cx += f.getlength(ch) + track
    return w


def texto_vertical(img, conteudo: str, caixa, estilo="titulo", tam=110, cor=C.grafite):
    """Texto girado 90° (de baixo para cima), como na faixa branca 'Deixa eu contar uma coisa pra vocês'."""
    x, y, L, A = caixa
    tmp = Image.new("RGBA", (A, L), (0, 0, 0, 0))
    texto(tmp, conteudo, (0, 0, A, L), estilo=estilo, tam=tam, cor=cor, alinhar="centro",
          valinhar="meio", entrelinha=1.05)
    img.paste(tmp.rotate(90, expand=True), (x, y), tmp.rotate(90, expand=True))


# ---------------------------------------------------------------- FOTO
def _abrir(foto):
    im = foto if isinstance(foto, Image.Image) else Image.open(foto)
    return ImageOps.exif_transpose(im).convert("RGB")


def _arredondar(im, raio):
    if raio <= 0:
        return im, None
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, im.size[0] - 1, im.size[1] - 1), raio, fill=255)
    return im, m


def foto(img, arquivo, caixa, modo="cobrir", raio=14, foco=(0.5, 0.4), sombra=False):
    """Coloca foto em caixa=(x, y, l, a). modo 'cobrir' corta para preencher; 'conter' mostra tudo.
    foco=(fx, fy) diz onde centralizar o corte (0–1)."""
    x, y, L, A = caixa
    im = _abrir(arquivo)
    if modo == "cobrir":
        esc = max(L / im.width, A / im.height)
        im = im.resize((math.ceil(im.width * esc), math.ceil(im.height * esc)), Image.LANCZOS)
        ox = int((im.width - L) * foco[0]); oy = int((im.height - A) * foco[1])
        im = im.crop((ox, oy, ox + L, oy + A))
    else:
        im.thumbnail((L, A), Image.LANCZOS)
        x += (L - im.width) // 2; y += (A - im.height) // 2
    im, m = _arredondar(im, raio)
    if sombra:
        s = Image.new("RGBA", (im.width + 40, im.height + 40), (0, 0, 0, 0))
        ImageDraw.Draw(s).rounded_rectangle((20, 24, im.width + 20, im.height + 24), raio, fill=(0, 0, 0, 60))
        s = s.filter(ImageFilter.GaussianBlur(12))
        img.paste(s, (x - 20, y - 20), s)
    img.paste(im, (x, y), m)
    return (x, y, im.width, im.height)


def grade_fotos(img, arquivos, caixa, colunas=None, vao=4, raio=14, pixelar_centro=None):
    """Fotos lado a lado (antes → durante → depois). pixelar_centro=(l, a) relativo pixeliza
    o centro de cada foto (leito da ferida), deixando a borda visível."""
    x, y, L, A = caixa
    n = len(arquivos); colunas = colunas or n
    linhas = math.ceil(n / colunas)
    cw = (L - vao * (colunas - 1)) / colunas; ch = (A - vao * (linhas - 1)) / linhas
    caixas = []
    for i, arq in enumerate(arquivos):
        cx = int(x + (i % colunas) * (cw + vao)); cy = int(y + (i // colunas) * (ch + vao))
        r = raio if n == 1 else 0
        cx_, cy_, w_, h_ = foto(img, arq, (cx, cy, int(cw), int(ch)), raio=r)
        if pixelar_centro:
            pl, pa = pixelar_centro
            pixelar(img, (int(cx_ + w_ * (1 - pl) / 2), int(cy_ + h_ * (1 - pa) / 2), int(w_ * pl), int(h_ * pa)))
        caixas.append((cx_, cy_, w_, h_))
    # cantos arredondados do conjunto
    if n > 1 and raio:
        x, y, L, A = int(x), int(y), int(L), int(A)
        fundo = img.getpixel((max(x - 2, 0), max(y - 2, 0)))
        regiao = img.crop((x, y, x + L, y + A))
        m = Image.new("L", (L, A), 0)
        ImageDraw.Draw(m).rounded_rectangle((0, 0, L - 1, A - 1), raio, fill=255)
        img.paste(Image.new("RGB", (L, A), fundo), (x, y))
        img.paste(regiao, (x, y), m)
    return caixas


def pixelar(img, caixa, bloco=28):
    """Pixeliza uma região (leito de ferida, rosto, nome). Use SEMPRE em imagem clínica publicada."""
    x, y, L, A = [int(v) for v in caixa]
    reg = img.crop((x, y, x + L, y + A))
    peq = reg.resize((max(1, L // bloco), max(1, A // bloco)), Image.BILINEAR)
    img.paste(peq.resize((L, A), Image.NEAREST), (x, y))


# ---------------------------------------------------------------- ELEMENTOS
def seta(img, de, para, curva=0.35, cor=C.carvao, larg=5, ponta=26):
    """Seta desenhada 'à mão' (curva suave) de 'de' para 'para'."""
    (x0, y0), (x1, y1) = de, para
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    nx, ny = -(y1 - y0), (x1 - x0)
    cx, cy = mx + nx * curva, my + ny * curva
    pts = [((1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1,
            (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1) for t in [i / 40 for i in range(41)]]
    d = ImageDraw.Draw(img)
    d.line(pts, fill=cor, width=larg, joint="curve")
    ang = math.atan2(pts[-1][1] - pts[-3][1], pts[-1][0] - pts[-3][0])
    for s in (-1, 1):
        a = ang + math.pi - s * 0.5
        d.line([(x1, y1), (x1 + ponta * math.cos(a), y1 + ponta * math.sin(a))], fill=cor, width=larg)


def botao(img, conteudo="Clica aqui e fala comigo!", centro=None, tam=34, cor_fundo=C.branco, cor=C.carvao, icone=True):
    """Botão/figurinha de link no estilo do Instagram."""
    W, H = img.size
    f = fonte("medio", tam)
    w = f.getlength(conteudo) + (tam * 1.6 if icone else 0) + tam * 1.4
    h = tam * 2.1
    cx, cy = centro or (W / 2, H * 0.78)
    x0, y0 = cx - w / 2, cy - h / 2
    s = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(s).rounded_rectangle((x0 + 3, y0 + 6, x0 + w + 3, y0 + h + 6), h / 2.6, fill=(0, 0, 0, 45))
    s = s.filter(ImageFilter.GaussianBlur(8)); img.paste(s, (0, 0), s)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((x0, y0, x0 + w, y0 + h), h / 2.6, fill=cor_fundo)
    tx = x0 + tam * 0.7
    if icone:  # elo de corrente simples
        r = tam * 0.28; ix, iy = tx + r, cy
        d.rounded_rectangle((ix - r * 1.3, iy - r * 0.6, ix + r * 0.2, iy + r * 0.6), r * 0.6, outline="#2F80ED", width=3)
        d.rounded_rectangle((ix - r * 0.2, iy - r * 0.6, ix + r * 1.3, iy + r * 0.6), r * 0.6, outline="#2F80ED", width=3)
        tx += tam * 1.6
    d.text((tx, cy - tam * 0.62), conteudo, font=f, fill=cor)


def assinatura(img, y=None, cor=C.texto, tam=20, arroba=True):
    W, H = img.size
    y = y if y is not None else H - 90
    rotulo(img, ASSINATURA, 0, y, tam=tam, cor=cor, alinhar="centro", largura=W, espaco=0.14)
    if arroba:
        texto(img, ARROBA, (0, y + tam * 1.9, W, tam * 2), estilo="medio", tam=int(tam * 1.2), cor=C.ouroEscuro, alinhar="centro")


def fio(img, x, y, largura, cor=C.ouro, esp=3):
    ImageDraw.Draw(img).rectangle((x, y, x + largura, y + esp), fill=cor)


def cartao(img, caixa, fundo=C.creme, borda=C.taupe, raio=22):
    x, y, L, A = caixa
    ImageDraw.Draw(img).rounded_rectangle((x, y, x + L, y + A), raio, fill=fundo, outline=borda, width=2)


def bolinha(img, n, centro, r=34, fundo=C.ouro, cor=C.branco):
    cx, cy = centro
    d = ImageDraw.Draw(img)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fundo)
    f = fonte("titulo_forte", int(r * 1.15)); t = str(n)
    d.text((cx - f.getlength(t) / 2, cy - r * 0.78), t, font=f, fill=cor)


# ---------------------------------------------------------------- MODELOS PRONTOS
def story_capa(foto_mari, frase, fundo_faixa=C.branco):
    """Faixa branca à esquerda com frase vertical + foto dela à direita ('Deixa eu contar uma coisa pra vocês')."""
    img = novo("story", fundo_faixa)
    foto(img, foto_mari, (330, 0, 750, 1920), raio=0, foco=(0.6, 0.4))
    texto_vertical(img, frase, (15, 200, 300, 1520), tam=104)
    return img


def story_titulo_fotos(titulo, rotulo_txt, fotos, fundo=C.branco, pixelar_centro=(0.45, 0.5), linhas_de=3):
    """Título condensado + rótulo espaçado + grade de fotos (antes/durante/depois), leito pixelado."""
    img = novo("story", fundo)
    h = texto(img, titulo, (110, 170, 860, 400), estilo="titulo", tam=78, cor=C.grafite, alinhar="centro", entrelinha=1.08)
    rotulo(img, rotulo_txt, 0, 170 + h + 40, tam=40, cor=C.grafite, alinhar="centro", largura=1080, estilo="leve", espaco=0.06)
    y = 170 + h + 150
    grupos = [fotos[i:i + linhas_de] for i in range(0, len(fotos), linhas_de)]
    alt = min(640 if len(grupos) == 1 else 420, (1920 - y - 160) // max(len(grupos), 1) - 50)
    for g in grupos:
        larg = min(960, int(alt * 0.68) * len(g))
        grade_fotos(img, g, ((1080 - larg) // 2, y, larg, alt), pixelar_centro=pixelar_centro)
        y += alt + 50
    return img


def story_pilha_foto(linhas_pilha, arquivo_foto, nota, fundo=C.branco, pixelar_centro=(0.25, 0.7)):
    """'É muito / importante / CUIDAR' + foto + seta com anotação ('da perilesão e da borda da ferida')."""
    img = novo("story", fundo)
    pilha(img, linhas_pilha, 300, 300)
    cx, cy, w, h = foto(img, arquivo_foto, (340, 620, 640, 680), raio=10)
    if pixelar_centro:
        pl, pa = pixelar_centro
        pixelar(img, (cx + w * 0.30, cy + h * (1 - pa) / 2, w * pl, h * pa))
    texto(img, nota, (40, 1010, 300, 220), estilo="titulo", tam=46, cor=C.grafite, alinhar="centro", entrelinha=1.05)
    seta(img, (210, 990), (cx + 50, cy + 220), curva=-0.25)
    return img


def story_texto(frase, fundo=C.nevoa, subtitulo=None):
    """Story só de texto: frase leve centralizada com **destaque**."""
    img = novo("story", fundo)
    h = texto(img, frase, (110, 0, 860, 1920), estilo="leve", tam=64, cor=C.texto, alinhar="centro", valinhar="meio")
    if subtitulo:
        texto(img, subtitulo, (180, 960 + h / 2 + 50, 720, 300), estilo="leve", tam=36, cor=C.texto, alinhar="centro", entrelinha=1.35)
    return img


def story_cta(foto_mari, chamada="E se você tem uma ferida e precisa de ajuda", botao_txt="Clica aqui e fala comigo!",
              fundo=C.cinza, cor_texto=C.grafite):
    """Foto dela + chamada condensada + botão de link. cor_texto=C.branco imita o story original
    (fica menos legível sobre cinza claro)."""
    img = novo("story", fundo)
    foto(img, foto_mari, (120, 560, 840, 680), raio=10, foco=(0.5, 0.35))
    texto(img, chamada, (120, 1270, 840, 300), estilo="titulo_forte", tam=68, cor=cor_texto, alinhar="centro", entrelinha=1.08, sombra=(cor_texto == C.branco))
    botao(img, botao_txt, centro=(540, 1560))
    return img


def carrossel(slides, fundo=C.branco, formato="post"):
    """Gera um carrossel 4:5. Cada slide é um dict:
      {"tipo": "capa", "titulo": "...", "sub": "...", "foto": caminho?}
      {"tipo": "texto", "rotulo": "01", "titulo": "...", "corpo": "..."}
      {"tipo": "lista", "titulo": "...", "itens": ["...", "..."]}
      {"tipo": "frase", "frase": "..."}
      {"tipo": "cta", "titulo": "...", "botao": "..."}
    Fundos alternam pela SEQUENCIA se fundo='sequencia'."""
    W, H = FORMATOS[formato]
    out = []
    for i, s in enumerate(slides):
        f = SEQUENCIA[i % len(SEQUENCIA)] if fundo == "sequencia" else fundo
        img = novo(formato, f)
        t = s.get("tipo", "texto")
        if t == "capa":
            tam = 84 if s.get("foto") else 104
            ht = altura(s["titulo"], W - 180, "titulo", tam, 1.05) + (60 if s.get("sub") else 0)
            if s.get("foto"):
                topo = int(H * 0.55)
                foto(img, s["foto"], (0, 0, W, topo), raio=0, foco=(0.5, 0.3))
            else:
                topo = 0
            y = topo + max(50, (H - 150 - topo - ht) / 2)
            h = texto(img, s["titulo"], (90, y, W - 180, 500), estilo="titulo", tam=tam, cor=C.grafite, entrelinha=1.05)
            if s.get("sub"):
                rotulo(img, s["sub"], 90, y + h + 10, tam=28, cor=C.ouroEscuro, estilo="rotulo", espaco=0.14)
        elif t == "texto":
            ht = altura(s["titulo"], W - 180, "titulo", 88, 1.08)
            hc = altura(s.get("corpo", ""), W - 180, "leve", 46, 1.45)
            y = max(150, (H - 140 - (90 + ht + 40 + hc)) / 2)
            if s.get("rotulo"):
                rotulo(img, s["rotulo"], 90, y, tam=28, cor=C.ouroEscuro)
            fio(img, 90, y + 50, 90)
            h = texto(img, s["titulo"], (90, y + 90, W - 180, 500), estilo="titulo", tam=88, cor=C.grafite, entrelinha=1.08)
            texto(img, s.get("corpo", ""), (90, y + 90 + h + 40, W - 180, 800), estilo="leve", tam=46, cor=C.texto, entrelinha=1.45)
        elif t == "lista":
            ht = altura(s["titulo"], W - 180, "titulo", 82, 1.08)
            his = [max(altura(it, W - 300, "normal", 42, 1.35), 80) for it in s["itens"]]
            y = max(130, (H - 140 - (ht + 50 + sum(his) + 44 * len(his))) / 2)
            h = texto(img, s["titulo"], (90, y, W - 180, 400), estilo="titulo", tam=82, cor=C.grafite, entrelinha=1.08)
            y += h + 50
            for n, (it, hi) in enumerate(zip(s["itens"], his), 1):
                bolinha(img, n, (130, y + 30), r=36)
                texto(img, it, (205, y, W - 300, 400), estilo="normal", tam=42, cor=C.texto, entrelinha=1.35)
                y += hi + 44
        elif t == "frase":
            hf = altura("“" + s["frase"] + "”", W - 220, "efeito", 84, 1.2)
            y = (H - 150 - hf - 70) / 2
            fio(img, W // 2 - 45, y, 90)
            texto(img, "“" + s["frase"] + "”", (110, y + 70, W - 220, 800), estilo="efeito", tam=84, cor=C.carvao, alinhar="centro", entrelinha=1.2)
        elif t == "cta":
            ht = altura(s["titulo"], W - 220, "titulo", 88, 1.08)
            y = (H - 150 - ht - 180) / 2
            h = texto(img, s["titulo"], (110, y, W - 220, 500), estilo="titulo", tam=88, cor=C.grafite, alinhar="centro", entrelinha=1.08)
            botao(img, s.get("botao", "Clica no link da bio"), centro=(W / 2, y + h + 110))
        assinatura(img, y=H - 110, tam=18)
        out.append(img)
    return out


def infografico(titulo, sub, blocos, rodape_fonte=None, fundo=C.branco, frase=None):
    """Infográfico A4 (1240×1754). blocos = [{"titulo": "...", "texto": "..."}, ...] (2 a 6).
    frase = frase-chave opcional (Cormorant itálico) numa faixa creme abaixo dos cartões.
    Vira PDF com salvar_pdf([img], ...)."""
    img = novo("a4", fundo)
    W, H = img.size
    rotulo(img, "MATERIAL EDUCATIVO", 90, 90, tam=22, cor=C.ouroEscuro)
    h = texto(img, titulo, (90, 135, W - 180, 300), estilo="titulo", tam=84, cor=C.grafite, entrelinha=1.05)
    h2 = texto(img, sub, (90, 135 + h + 20, W - 180, 200), estilo="leve", tam=32, cor=C.texto, entrelinha=1.35)
    y = 135 + h + h2 + 70
    fio(img, 90, y - 30, W - 180, cor=C.taupe, esp=2)
    col = 2 if len(blocos) > 3 else 1
    cw = (W - 180 - 40 * (col - 1)) / col
    lin = math.ceil(len(blocos) / col)
    disp = H - y - 260
    precisa = [130 + altura(b["texto"], cw - 80, "normal", 27, 1.45) + 40 for b in blocos]
    alturas_linha = [max(precisa[r * col:(r + 1) * col]) for r in range(lin)]
    escala = min(1.0, (disp - 30 * (lin - 1)) / sum(alturas_linha))
    alturas_linha = [a * escala for a in alturas_linha]
    for i, b in enumerate(blocos):
        r = i // col; ch = alturas_linha[r]
        cx = 90 + (i % col) * (cw + 40); cy = y + sum(alturas_linha[:r]) + 30 * r
        cartao(img, (int(cx), int(cy), int(cw), int(ch)))
        bolinha(img, i + 1, (cx + 60, cy + 70), r=30)
        texto(img, b["titulo"], (cx + 110, cy + 42, cw - 140, 120), estilo="titulo", tam=40, cor=C.grafite, entrelinha=1.05)
        texto(img, b["texto"], (cx + 40, cy + 130, cw - 80, ch - 150), estilo="normal", tam=27, cor=C.texto, entrelinha=1.45)
    fim = y + sum(alturas_linha) + 30 * (lin - 1)
    if frase:
        hf = altura("“" + frase + "”", W - 300, "efeito", 46, 1.2)
        yf = fim + max(40, (H - 260 - fim - hf - 80) / 2)
        ImageDraw.Draw(img).rectangle((90, yf, W - 90, yf + hf + 70), fill=C.creme)
        fio(img, 90, yf, 6, cor=C.ouro, esp=hf + 70)
        texto(img, "“" + frase + "”", (150, yf + 35, W - 300, hf), estilo="efeito", tam=46, cor=C.carvao, alinhar="centro", entrelinha=1.2)
    if rodape_fonte:
        texto(img, "Fonte: " + rodape_fonte, (90, H - 190, W - 180, 60), estilo="leve", tam=20, cor=C.texto)
    assinatura(img, y=H - 120, tam=19)
    return img


def folha_contato(imagens, colunas=4, largura=360):
    """Prévia lado a lado para conferência (QA)."""
    th = [im.copy() for im in imagens]
    for t in th:
        t.thumbnail((largura, largura * 2))
    h = max(t.height for t in th); lin = math.ceil(len(th) / colunas)
    folha = Image.new("RGB", (colunas * (largura + 16) + 16, lin * (h + 16) + 16), "#9E9E9E")
    for i, t in enumerate(th):
        folha.paste(t, (16 + (i % colunas) * (largura + 16), 16 + (i // colunas) * (h + 16)))
    return folha

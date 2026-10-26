# Gera as imagens dos botões do painel v1.2 (2x para nitidez) e imprime o base64 de cada uma.
# Uso: python3 botoes.py <pasta_saida>
import base64, os, sys
from PIL import Image, ImageDraw, ImageFont

FONTE = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
BOTOES = {
    'salvar': ('Salvar simulação', (15, 110, 110), 220),   # verde-petróleo
    'nova': ('Nova simulação', (31, 58, 95), 160),         # azul-marinho
}
S, H = 2, 40
saida = sys.argv[1]
for nome, (texto, cor, w) in BOTOES.items():
    img = Image.new('RGBA', (w * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, w * S - 1, H * S - 1), radius=7 * S, fill=cor + (255,))
    f = ImageFont.truetype(FONTE, 14 * S)
    bb = d.textbbox((0, 0), texto, font=f)
    d.text(((w * S - (bb[2] - bb[0])) / 2 - bb[0], (H * S - (bb[3] - bb[1])) / 2 - bb[1]), texto,
           font=f, fill=(255, 255, 255, 255))
    p = os.path.join(saida, f'botao_{nome}.png')
    img.save(p, optimize=True)
    print(nome, base64.b64encode(open(p, 'rb').read()).decode())

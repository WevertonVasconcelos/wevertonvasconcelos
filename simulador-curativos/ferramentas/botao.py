# Gera a imagem PNG do botão "Salvar simulação" (2x para nitidez)
from PIL import Image, ImageDraw, ImageFont
import base64, sys
W,H,S = 230,44,2
img = Image.new('RGBA',(W*S,H*S),(0,0,0,0))
d = ImageDraw.Draw(img)
d.rounded_rectangle((0,0,W*S-1,H*S-1), radius=8*S, fill=(140,112,68,255))
d.rounded_rectangle((0,H*S-4*S,W*S-1,H*S-1), radius=8*S, fill=(110,86,50,255))
d.rounded_rectangle((0,0,W*S-1,H*S-4*S), radius=8*S, fill=(140,112,68,255))
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15*S)
t = 'Salvar simulação'
bb = d.textbbox((0,0),t,font=f)
d.text(((W*S-(bb[2]-bb[0]))/2-bb[0], (H*S-4*S-(bb[3]-bb[1]))/2-bb[1]), t, font=f, fill=(255,255,255,255))
img.save(sys.argv[1], optimize=True)
open(sys.argv[2],'w').write(base64.b64encode(open(sys.argv[1],'rb').read()).decode())

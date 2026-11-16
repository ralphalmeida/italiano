"""Gera os ícones do app (tela inicial do iPhone, PWA e favicon) em public/icons.

Uso: python3 scripts/make-icons.py   (usa fontes do macOS)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parent.parent / 'public' / 'icons'
S = 2048  # desenha grande e reduz, para bordas suaves

BG_TOP = (14, 84, 61)
BG_BOTTOM = (5, 38, 29)
IVORY = (246, 239, 222)
GOLD = (214, 178, 106)
TRI = [(38, 166, 98), (246, 239, 222), (214, 64, 54)]


def background(size):
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x * 0.35 + y * 0.65) / size
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOTTOM))
    # brilho suave no topo
    glow = Image.new('L', (size, size), 0)
    ImageDraw.Draw(glow).ellipse((-size * 0.3, -size * 0.65, size * 1.3, size * 0.45), fill=70)
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.12))
    return Image.composite(Image.new('RGB', (size, size), (60, 140, 105)), img, glow)


def draw_icon(size, scale=1.0):
    """scale < 1 encolhe o desenho (zona segura dos ícones 'maskable')."""
    img = background(S)
    d = ImageDraw.Draw(img)
    c = S / 2
    k = scale

    # moldura fina dourada
    m = S * (0.5 - 0.40 * k)
    d.rounded_rectangle((m, m, S - m, S - m), radius=S * 0.16 * k, outline=GOLD + (255,), width=round(S * 0.008 * k))

    # monograma "It"
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Didot.ttc', round(S * 0.50 * k), index=1)
    text = 'It'
    box = d.textbbox((0, 0), text, font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    x = c - w / 2 - box[0]
    y = c - h / 2 - box[1] - S * 0.06 * k
    d.text((x, y), text, font=font, fill=IVORY)

    # faixa tricolor
    bw, bh = S * 0.30 * k, S * 0.022 * k
    by = c + h / 2 + S * 0.02 * k
    seg = bw / 3
    for i, col in enumerate(TRI):
        x0 = c - bw / 2 + i * seg
        d.rectangle((x0, by, x0 + seg, by + bh), fill=col)

    # "ITALIANO" espaçado, discreto
    small = ImageFont.truetype('/System/Library/Fonts/Supplemental/Didot.ttc', round(S * 0.058 * k), index=0)
    letters, gap = 'ITALIANO', S * 0.022 * k
    widths = [d.textlength(ch, font=small) for ch in letters]
    lx = c - (sum(widths) + gap * (len(letters) - 1)) / 2
    for ch, cw in zip(letters, widths):
        d.text((lx, by + bh + S * 0.045 * k), ch, font=small, fill=GOLD)
        lx += cw + gap

    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    big = draw_icon(1024)
    big.save(OUT / 'icon-1024.png')
    for size, name in [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png'), (32, 'favicon-32.png')]:
        big.resize((size, size), Image.LANCZOS).save(OUT / name)
    draw_icon(512, scale=0.78).save(OUT / 'icon-maskable-512.png')
    print('ícones gerados em', OUT)


if __name__ == '__main__':
    main()

from PIL import Image, ImageDraw
import math

def rounded_bg(size, radius_ratio, bg):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=bg)
    return img, d

def draw_glow_rect(d, x, y, w, h, color, glow_color, glow_px):
    for i in range(glow_px, 0, -2):
        alpha = int(28 * (1 - i / glow_px))
        c = glow_color + (alpha,)
        d.rounded_rectangle([x - i, y - i, x + w + i, y + h + i], radius=max(2, int(w * 0.18)), fill=c)
    d.rounded_rectangle([x, y, x + w, y + h], radius=max(2, int(w * 0.22)), fill=color + (255,))

def make_icon(size, maskable=False):
    bg = (5, 6, 10, 255)
    radius_ratio = 0.5 if maskable else 0.22
    img, d = rounded_bg(size, radius_ratio, bg)

    pad = size * (0.30 if maskable else 0.16)
    cell = (size - 2 * pad) / 4.0

    cyan = (76, 243, 255)
    magenta = (255, 62, 165)
    amber = (255, 201, 76)

    # Simple abstract tetromino cluster: S/Z-ish 4-block motif
    blocks = [
        (0, 1, cyan), (1, 1, cyan),
        (1, 0, magenta), (2, 0, magenta),
        (2, 1, amber), (3, 1, amber),
    ]
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for gx, gy, color in blocks:
        x = pad + gx * cell
        y = pad + gy * cell + cell * 0.5
        draw_glow_rect(gd, x, y, cell * 0.92, cell * 0.92, color, color, int(cell * 0.35))
    img = Image.alpha_composite(img, glow)
    return img

import os
outdir = os.path.dirname(os.path.abspath(__file__))
os.makedirs(outdir, exist_ok=True)
make_icon(192).save(f"{outdir}/icon-192.png")
make_icon(512).save(f"{outdir}/icon-512.png")
make_icon(192, maskable=True).save(f"{outdir}/icon-maskable-192.png")
make_icon(512, maskable=True).save(f"{outdir}/icon-maskable-512.png")
make_icon(180).save(f"{outdir}/apple-touch-icon.png")
print("done")

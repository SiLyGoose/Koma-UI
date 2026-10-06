"""
Makes the loading screen's sprites (src/shared/transition/head.css): each character's sprite as a glowing
gold silhouette, like a hero running in the dark. Pixel art is scaled up without smoothing first,
so the silhouette keeps its pixels; the glow is soft round it.

    python scripts/silhouette.py public/characters/tsuri/sprite.png public/characters/tsuri/silhouette.png

Needs Pillow (pip install pillow). A new character's goes in SPRITES in src/shared/transition/head.js
(and the character in src/shared/characters.ts).
"""
import sys
from PIL import Image, ImageFilter

SCALE = 4
PAD = 28
TOP, BOTTOM = (255, 232, 170), (224, 160, 70)  # the silhouette, light at the head to deep gold at the feet
GLOW = (216, 160, 64)

src, out = sys.argv[1], sys.argv[2]
sprite = Image.open(src).convert('RGBA')
sprite = sprite.resize((sprite.width * SCALE, sprite.height * SCALE), Image.NEAREST)
w, h = sprite.width + PAD * 2, sprite.height + PAD * 2
alpha = Image.new('L', (w, h), 0)
alpha.paste(sprite.getchannel('A').point(lambda a: 255 if a > 40 else 0), (PAD, PAD))

canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
# Two glows: a wide faint one and a close bright one.
for radius, strength in ((16, 0.45), (6, 0.9)):
    glow = alpha.filter(ImageFilter.GaussianBlur(radius)).point(lambda a: int(a * strength))
    canvas.alpha_composite(Image.merge('RGBA', (*[Image.new('L', (w, h), c) for c in GLOW], glow)))
# The silhouette, shaded top to bottom.
fill = Image.new('RGBA', (w, h))
for y in range(h):
    t = min(1, max(0, (y - PAD) / max(1, sprite.height)))
    colour = tuple(round(a + (b - a) * t) for a, b in zip(TOP, BOTTOM))
    fill.paste(colour + (255,), (0, y, w, y + 1))
fill.putalpha(alpha)
canvas.alpha_composite(fill)
canvas.save(out)
print(out, canvas.size)

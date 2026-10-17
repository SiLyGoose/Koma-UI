"""
Paints where the Dragon Raid's dragons are fought, as King's Raid names their lairs: Dragia, the mountain of red lava
(Temeraire); Turandana, the land of ice (Scalaxia); Grimvine, the swamp of death (Zyrrkinoth); and Ashen Nox, the Black
Sun (Armarta). Each is painted once, into the two pictures the page reads (src/technomagic/bosses/dragon/scenery.ts), on
the same sheet and with the same brushes as Galgoria's wasteland (./wasteland.py):

    backdrop.webp  what stands behind the field, on an upright sheet across the back of it
    ground.webp    one tile of the floor, repeated

    python scripts/lairs.py public/technomagic/scenery

writes public/technomagic/scenery/<lair>/. Needs Pillow (pip install pillow). The same SEED paints the same pictures.
Each lair's haze (HAZES) is also in scenery.ts: a change to one is a change to the other.
"""
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps

import wasteland as w
from wasteland import BOTTOM, LEFT, RIGHT, TOP, W, H, TILE, canvas, fill, fractal, hexc, mist, noise, paint, profile, px, py, ridge, scaled, shrink, skyline, spire, stone, tfractal, tiled, tree, vgrad

SEED = 11
# What each floor fades into toward the back, and the foot of everything on its sheet (scenery.ts's haze).
HAZES = {'dragia': '#3a1f1a', 'turandana': '#9aa9b8', 'grimvine': '#2c3626', 'ashen-nox': '#1d1a22'}


def glow(base, mask, colour, blur, strength):
    """Light laid over `base` where `mask` is, spread by `blur`."""
    base.paste(Image.new('RGB', (W, H), hexc(colour)), (0, 0), scaled(mask.filter(ImageFilter.GaussianBlur(blur)), strength))


def mountains(keys, rough, peaks=()):
    """A range: a broken skyline through `keys`, crags going up out of it at `peaks` (x, height)."""
    m, d = canvas()
    skyline(d, keys, rough)
    for x, h in peaks:
        spire(d, x, w.rnd.uniform(2.2, 4), h, w.rnd.uniform(-0.1, 0.1))
    return shrink(m)


def floor_rubble(height=1.0):
    """Rocks and rises all along the foot of the sheet."""
    m, d = canvas()
    keys, x = [], LEFT
    while x < RIGHT:
        keys.append((x, w.rnd.choice((-0.2, 0.1, 0.3, 0.6, 1.0)) * height * w.rnd.uniform(0.6, 1.1)))
        x += w.rnd.uniform(0.8, 4.5)
    fill(d, profile(keys + [(RIGHT, 0.2)], 0.35) + [(RIGHT, BOTTOM - 1), (LEFT, BOTTOM - 1)])
    return shrink(m)


def finish(img, haze):
    """Mist along the floor, the same as the floor's haze where they meet; and grain over all."""
    img = Image.composite(Image.new('RGB', (W, H), hexc(haze)), img, vgrad(lambda y: max(0.0, min(1.0, (1.3 - y) / 1.3)) ** 1.6))
    return Image.blend(img, noise(W, H, 1.2).convert('RGB'), 0.035)


def sky(dark, light, cell=420):
    clouds = fractal(W, H, cell, 6, sx=2.6, sy=0.9)
    height = vgrad(lambda y: (1 - max(0.0, y) / TOP) ** 1.4)
    return ImageOps.colorize(Image.blend(height, clouds, 0.38), hexc(dark), hexc(light))


# --- Dragia: black rock under a red sky, lava running down it ---------------------------------------------------------

def dragia():
    haze = HAZES['dragia']
    img = sky('#1a0b0a', '#a8442a')
    far = mountains([(LEFT, 6), (-40, 14), (-28, 9), (-14, 18), (-2, 11), (12, 20), (26, 12), (40, 16), (RIGHT, 9)], 2.2)
    paint(img, far, stone(90, 5), '#3a1a16', '#5a2a20', mist(12, 0.6), haze='#5a2a1e', blur=1.5)
    # The mountain itself, behind the dragon: a cone with its top blown off, glowing.
    m, d = canvas()
    fill(d, ridge((-6, -0.5), (6, 12), 2.2, 7) + ridge((6, 12), (12, 24), 2.2, 7)[1:] + ridge((12, 24), (19, 25), 0.6, 5)[1:] + ridge((19, 25), (27, 13), 2.2, 7)[1:] + ridge((27, 13), (40, -0.5), 2.2, 7)[1:])
    cone = shrink(m)
    paint(img, cone, stone(60, 4), '#1c0e0c', '#3b1d17', mist(6, 0.55), haze=hexc(haze), rim=0.5)
    # Lava running down it, and its mouth alight.
    m, d = canvas()
    for x0 in (10.5, 13, 15.5, 18):
        # (Sideways, not up: the lava wanders as it runs down.)
        pts = [(b, a) for a, b in ridge((24.5, x0), (0, x0 + w.rnd.uniform(-9, 9)), 2.5, 7)]
        d.line([(px(a), py(b)) for a, b in pts], fill=255, width=7, joint='curve')
    lava = Image.composite(shrink(m), Image.new('L', (W, H), 0), cone)
    glow(img, lava, '#ff5a1a', 6, 0.7)
    glow(img, lava, '#ffb347', 1, 0.9)
    m, d = canvas()
    d.ellipse([px(11), py(27), px(20), py(23)], fill=255)
    glow(img, shrink(m), '#ff7a2a', 30, 0.8)
    near = mountains([(LEFT, 3), (-46, 8), (-36, 4), (-24, 6), (-16, 3)], 1.2, ((-41, 12), (-30, 9)))
    paint(img, near, stone(40, 3), '#140a09', '#2e1612', mist(4, 0.5), haze=hexc(haze), rim=0.6)
    paint(img, floor_rubble(), stone(25, 2, 0.2), '#120908', '#2a1410', mist(1.6, 0.3), haze=hexc(haze), rim=0.4)
    return finish(img, haze)


def dragia_ground():
    T = TILE
    shade = Image.blend(tfractal(T, 256, 7), tfractal(T, 32, 4), 0.3)
    img = ImageOps.colorize(shade, hexc('#140b0a'), hexc('#3a201a'))
    return cracked(img, '#ff6a1f', '#ffc060', glowing=True)


# --- Turandana: snow and ice under a pale sky -------------------------------------------------------------------------

def turandana():
    haze = HAZES['turandana']
    img = sky('#4d6075', '#dfe8f0')
    far = mountains([(LEFT, 8), (-42, 17), (-30, 11), (-16, 20), (-4, 13), (10, 22), (24, 14), (38, 19), (RIGHT, 12)], 2.4)
    paint(img, far, stone(90, 5), '#a9b6c4', '#e8eef4', mist(12, 0.5), haze='#c3cfda', rim=0.8, blur=1.2)
    mid = mountains([(LEFT, 4), (-40, 9), (-26, 6), (-12, 10), (2, 5), (16, 11), (30, 7), (44, 10), (RIGHT, 6)], 1.6, ((-34, 14), (20, 15), (38, 13)))
    paint(img, mid, stone(60, 4), '#71849a', '#c9d5e1', mist(5, 0.6), haze=hexc(haze), rim=0.9)
    # Pillars of ice standing out of the snow.
    m, d = canvas()
    for x in (-38, -27, -9, 14, 27, 35, 46):
        spire(d, x, w.rnd.uniform(1, 2), w.rnd.uniform(4, 9), w.rnd.uniform(-0.15, 0.15), 0.08)
    ice = shrink(m)
    paint(img, ice, fractal(W, H, 30, 4), '#5f8fb8', '#c8ecff', mist(3, 0.3), haze=hexc(haze), rim=1.0)
    glow(img, ice, '#bfe9ff', 8, 0.25)
    paint(img, floor_rubble(0.8), stone(25, 2, 0.2), '#8796a8', '#e6edf3', mist(1.6, 0.3), haze=hexc(haze), rim=0.5)
    return finish(img, haze)


def turandana_ground():
    T = TILE
    shade = Image.blend(tfractal(T, 256, 7), tfractal(T, 48, 4), 0.35)
    img = ImageOps.colorize(shade, hexc('#a9b8c7'), hexc('#eef3f7'))
    # Ice showing through the snow in patches.
    sheet = tfractal(T, 192, 5).point(lambda v: max(0, min(255, (v - 140) * 4)))
    img = Image.composite(Image.new('RGB', (T, T), hexc('#7fa9cc')), img, scaled(sheet.filter(ImageFilter.GaussianBlur(5)), 0.6))
    return cracked(img, '#5a85ad', '#d8f0ff', count=12)


# --- Grimvine: a swamp under a sick green sky, dead trees standing in it ---------------------------------------------

def grimvine():
    haze = HAZES['grimvine']
    img = sky('#121a10', '#7f8f5a')
    far = mountains([(LEFT, 5), (-36, 9), (-20, 6), (-4, 10), (14, 7), (32, 11), (RIGHT, 6)], 1.6)
    paint(img, far, stone(90, 5), '#2c3a26', '#45553a', mist(9, 0.6), haze='#4a5a3c', blur=1.5)
    m, d = canvas()
    for x in range(int(LEFT) + 2, int(RIGHT), 3):
        tree(d, x + w.rnd.uniform(-1, 1), -0.2, math.pi / 2 + w.rnd.uniform(-0.3, 0.3), w.rnd.uniform(2.5, 6.5), 0.4, 6)
    paint(img, shrink(m), stone(30, 3), '#141b10', '#2a3420', mist(4, 0.55), haze=hexc(haze), rim=0.3)
    # Pools giving off a green glow.
    m, d = canvas()
    for x in (-40, -22, -3, 18, 36):
        d.ellipse([px(x - 4), py(0.5), px(x + 4), py(-0.3)], fill=255)
    pools = shrink(m)
    glow(img, pools, '#7dff5a', 14, 0.35)
    paint(img, floor_rubble(0.7), stone(25, 2, 0.2), '#10150d', '#25301c', mist(1.6, 0.3), haze=hexc(haze), rim=0.3)
    return finish(img, haze)


def grimvine_ground():
    T = TILE
    shade = Image.blend(tfractal(T, 256, 7), tfractal(T, 32, 4), 0.3)
    img = ImageOps.colorize(shade, hexc('#151a10'), hexc('#34402a'))
    pools = tfractal(T, 160, 5).point(lambda v: max(0, min(255, (v - 160) * 4)))
    img = Image.composite(Image.new('RGB', (T, T), hexc('#2c4220')), img, scaled(pools.filter(ImageFilter.GaussianBlur(9)), 0.6))
    img = Image.composite(Image.new('RGB', (T, T), hexc('#5f8a3e')), img, scaled(pools.filter(ImageFilter.GaussianBlur(3)).point(lambda v: max(0, v - 210) * 4), 0.25))
    return Image.blend(img, tiled(T, 2).convert('RGB'), 0.04)


# --- Ashen Nox: black stone under the Black Sun -----------------------------------------------------------------------

def ashen_nox():
    haze = HAZES['ashen-nox']
    img = sky('#07060a', '#3a3046')
    # The Black Sun: a black disc, its corona burning violet.
    m, d = canvas()
    d.ellipse([px(4), py(30), px(18), py(16)], fill=255)
    sun = shrink(m)
    glow(img, sun, '#b27aff', 40, 0.9)
    glow(img, sun, '#f0d8ff', 8, 0.7)
    img.paste(Image.new('RGB', (W, H), hexc('#050407')), (0, 0), sun.filter(ImageFilter.GaussianBlur(1)).point(lambda v: min(255, v * 2)))
    far = mountains([(LEFT, 7), (-40, 15), (-24, 9), (-8, 13), (26, 15), (40, 9), (RIGHT, 12)], 2.2, ((-30, 20), (34, 22)))
    paint(img, far, stone(90, 5), '#16131b', '#2c2633', mist(10, 0.55), haze='#2a2431', rim=0.6, blur=1.0)
    near = mountains([(LEFT, 3), (-44, 6), (-32, 3.5), (-20, 5), (-10, 2.5), (22, 3), (34, 6), (48, 4), (RIGHT, 5)], 1.2, ((-38, 11), (-17, 9), (30, 12), (44, 10)))
    paint(img, near, stone(40, 3), '#0a090d', '#1f1b25', mist(4, 0.5), haze=hexc(haze), rim=0.7)
    paint(img, floor_rubble(), stone(25, 2, 0.2), '#09080b', '#1c1921', mist(1.6, 0.3), haze=hexc(haze), rim=0.4)
    return finish(img, haze)


def ashen_ground():
    T = TILE
    shade = Image.blend(tfractal(T, 256, 7), tfractal(T, 32, 4), 0.3)
    img = ImageOps.colorize(shade, hexc('#0b0a0e'), hexc('#26222b'))
    return cracked(img, '#8a4dff', '#d9b8ff', glowing=True, count=14)


def cracked(img, dark, light, glowing=False, count=22):
    """Cracks over a tile, running on into the next one: dark ones, or (`glowing`) alight."""
    T = TILE
    k = 2
    cracks = Image.new('L', (T * k, T * k), 0)
    d = ImageDraw.Draw(cracks)

    def crack(x, y, ang, steps, width):
        pts = [(x, y)]
        for _ in range(steps):
            ang += w.rnd.uniform(-0.45, 0.45)
            step = w.rnd.uniform(8, 20) * k
            x, y = x + math.cos(ang) * step, y + math.sin(ang) * step
            pts.append((x, y))
            if width > 1 and w.rnd.random() < 0.08:
                crack(x, y, ang + w.rnd.choice((-1, 1)) * w.rnd.uniform(0.6, 1.2), steps // 3, width - 1)
        for ox in (-T * k, 0, T * k):
            for oy in (-T * k, 0, T * k):
                d.line([(a + ox, b + oy) for a, b in pts], fill=255, width=width * k, joint='curve')

    for _ in range(count):
        crack(w.rnd.uniform(0, T * k), w.rnd.uniform(0, T * k), w.rnd.uniform(0, 2 * math.pi), w.rnd.randint(10, 40), w.rnd.choice((1, 2, 2, 3)))
    cracks = cracks.resize((T, T), Image.LANCZOS)
    if glowing:
        img = Image.composite(Image.new('RGB', (T, T), hexc(dark)), img, scaled(cracks.filter(ImageFilter.GaussianBlur(5)), 0.6))
        img = Image.composite(Image.new('RGB', (T, T), hexc(light)), img, scaled(cracks, 0.9))
    else:
        img = Image.composite(Image.new('RGB', (T, T), hexc(light)), img, scaled(cracks.filter(ImageFilter.GaussianBlur(2)), 0.4))
        img = Image.composite(Image.new('RGB', (T, T), hexc(dark)), img, scaled(cracks, 0.7))
    return Image.blend(img, tiled(T, 2).convert('RGB'), 0.04)


LAIRS = {'dragia': (dragia, dragia_ground), 'turandana': (turandana, turandana_ground), 'grimvine': (grimvine, grimvine_ground), 'ashen-nox': (ashen_nox, ashen_ground)}

if __name__ == '__main__':
    root = Path(sys.argv[1] if len(sys.argv) > 1 else 'public/technomagic/scenery')
    for name, (back, floor) in LAIRS.items():
        w.rnd.seed(f'{SEED}:{name}')
        out = root / name
        out.mkdir(parents=True, exist_ok=True)
        back().save(out / 'backdrop.webp', quality=85, method=6)
        floor().save(out / 'ground.webp', quality=88, method=6)
        print(f'{out}: backdrop {W}x{H}, ground {TILE}x{TILE}')

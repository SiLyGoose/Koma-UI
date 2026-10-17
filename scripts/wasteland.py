"""
Paints the wasteland Galgoria is fought in, as the game has it: a grey waste under a grey sky, broken cliffs and
ruins going back into the haze, a great fallen slab, dead trees and bent street lamps. It is painted once, into the
two pictures the page reads (src/technomagic/bosses/galgoria/scenery.ts), not made again each fight:

    backdrop.webp  what stands behind the field: on an upright sheet across the back of it (LEFT..RIGHT, BOTTOM..TOP,
                   in the field's units), of which the camera sees the middle, more or less of it by the page's shape
    ground.webp    one tile of the floor, repeated

    python scripts/wasteland.py public/technomagic/scenery/wasteland

Needs Pillow (pip install pillow). The same SEED paints the same pictures. The sheet's edges and the haze are also in
scenery.ts: a change to one is a change to the other.
"""
import math
import random
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

SEED = 7
# The sheet, in the field's units (x along the field, y up from the floor; the boss stands at x 7, the heroes left of 0).
LEFT, RIGHT, BOTTOM, TOP = -60, 60, -1, 35
PPU = 34  # pixels to a unit
SS = 2  # shapes are drawn this much bigger, then made smaller: smooth edges
W, H = (RIGHT - LEFT) * PPU, (TOP - BOTTOM) * PPU
# What the floor fades into toward the back, and the foot of everything on the sheet: they meet there.
HAZE = (0x47, 0x46, 0x4A)
TILE = 1024  # the ground's tile, in pixels

rnd = random.Random(SEED)


def hexc(s):
    return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))


def px(x):
    return (x - LEFT) * PPU * SS


def py(y):
    return (TOP - y) * PPU * SS


# --- Noise ---------------------------------------------------------------------------------------------------------

def noise(w, h, cw, ch=None):
    """Smooth noise: random values `cw` by `ch` pixels apart, made smooth between."""
    ch = ch or cw
    sw, sh = max(2, round(w / cw)), max(2, round(h / ch))
    return Image.frombytes('L', (sw, sh), rnd.randbytes(sw * sh)).resize((w, h), Image.BICUBIC)


def fractal(w, h, cell, octaves=6, sx=1.0, sy=1.0):
    """Noise at many sizes, the larger stronger: clouds, stone. `sx`, `sy` stretch it."""
    acc, total, weight = None, 0.0, 1.0
    for i in range(octaves):
        c = max(1.0, cell / 2 ** i)
        layer = noise(w, h, c * sx, c * sy)
        acc = layer if acc is None else Image.blend(acc, layer, weight / (total + weight))
        total += weight
        weight *= 0.55
    return ImageOps.autocontrast(acc, cutoff=0.5)


def tiled(size, cell):
    """Smooth noise that repeats every `size` pixels each way."""
    s = max(2, size // cell)
    small = Image.frombytes('L', (s, s), rnd.randbytes(s * s))
    big = Image.new('L', (3 * s, 3 * s))
    for i in range(3):
        for j in range(3):
            big.paste(small, (i * s, j * s))
    return big.resize((3 * size, 3 * size), Image.BICUBIC).crop((size, size, 2 * size, 2 * size))


def tfractal(size, cell, octaves):
    acc, total, weight = None, 0.0, 1.0
    for i in range(octaves):
        layer = tiled(size, max(2, cell >> i))
        acc = layer if acc is None else Image.blend(acc, layer, weight / (total + weight))
        total += weight
        weight *= 0.55
    return ImageOps.autocontrast(acc, cutoff=0.5)


def vgrad(fn):
    """Up the sheet: fn(y) (0 to 1) at each height y."""
    col = Image.new('L', (1, H))
    col.putdata([max(0, min(255, round(255 * fn(TOP - (r + 0.5) / PPU)))) for r in range(H)])
    return col.resize((W, H), Image.NEAREST)


def scaled(img, k):
    return img.point(lambda v: round(v * k))


# --- Shapes --------------------------------------------------------------------------------------------------------

def ridge(a, b, rough, depth=8, decay=0.55):
    """A broken line from a to b: each half pushed up or down at random, less at each halving."""
    pts, amp = [a, b], rough
    for _ in range(depth):
        nxt = [pts[0]]
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            nxt += [((ax + bx) / 2, (ay + by) / 2 + rnd.uniform(-amp, amp)), (bx, by)]
        pts, amp = nxt, amp * decay
    return pts


def profile(keys, rough):
    """A skyline through `keys` (x, y), broken between them."""
    pts = [keys[0]]
    for a, b in zip(keys, keys[1:]):
        pts += ridge(a, b, rough * (abs(b[0] - a[0]) / 6) ** 0.5)[1:]
    return pts


def fill(d, pts):
    d.polygon([(px(x), py(y)) for x, y in pts], fill=255)


def skyline(d, keys, rough):
    pts = profile(keys, rough)
    fill(d, pts + [(pts[-1][0], BOTTOM - 1), (pts[0][0], BOTTOM - 1)])


def spire(d, x, w, h, lean=0.0, rough=None):
    """A crag going up to a point (tilted by `lean`), its sides broken."""
    rough = rough if rough is not None else w * 0.12
    tip = (x + lean * h, h)
    left = ridge((x - w / 2, -0.5), tip, rough, 7)
    right = ridge(tip, (x + w / 2, -0.5), rough, 7)
    fill(d, left + right[1:])


def ruin(d, x, w, h, lean=0.0, holes=0):
    """A broken tower: upright sides, its top torn away."""
    x0, x1 = x - w / 2, x + w / 2
    drop = rnd.uniform(0.15, 0.5) * h
    top = ridge((x0 + lean * h, h - rnd.uniform(0, drop)), (x1 + lean * (h - drop), h - drop), w * 0.25, 6)
    fill(d, [(x0, -0.5)] + ridge((x0, -0.5), top[0], w * 0.03, 4)[1:] + top[1:] + ridge(top[-1], (x1, -0.5), w * 0.03, 4)[1:])
    for _ in range(holes):
        hx, hy = rnd.uniform(x0 + w * 0.2, x1 - w * 0.3), rnd.uniform(h * 0.25, h - drop - 1)
        hw, hh = w * rnd.uniform(0.08, 0.16), rnd.uniform(0.4, 0.9)
        d.rectangle([px(hx + lean * hy), py(hy + hh), px(hx + hw + lean * hy), py(hy)], fill=0)


def line(d, a, b, width):
    d.line([(px(a[0]), py(a[1])), (px(b[0]), py(b[1]))], fill=255, width=max(1, round(width * PPU * SS)))
    r = width * PPU * SS / 2
    for x, y in (a, b):
        d.ellipse([px(x) - r, py(y) - r, px(x) + r, py(y) + r], fill=255)


def tree(d, x, y, ang, length, width, depth):
    """A dead tree, from (x, y) at `ang`: a limb, and two or three thinner from its end."""
    end = (x + math.cos(ang) * length, y + math.sin(ang) * length)
    line(d, (x, y), end, width)
    if depth == 0:
        return
    for _ in range(rnd.choice((2, 2, 3))):
        turn = rnd.uniform(-0.75, 0.75)
        tree(d, end[0], end[1], ang + turn, length * rnd.uniform(0.58, 0.78), width * 0.62, depth - 1)


def lamp(d, x, h, lean=0.0, broken=False):
    """A street lamp of iron: a post on a foot, a bar across its top, a lamp hung from each end."""
    top = (x + lean * h, h)
    fill(d, [(x - 0.32, -0.2), (x + 0.32, -0.2), (x + 0.16, 0.7), (x - 0.16, 0.7)])
    line(d, (x, 0), top, 0.13)
    line(d, (top[0], top[1]), (top[0] + lean * 0.8, top[1] + 0.8), 0.06)
    if broken:
        return
    for side in (-1, 1):
        arm = (top[0] + side * 0.75, top[1] - 0.1 + side * lean * 0.75)
        line(d, (top[0], top[1] - 0.25), arm, 0.07)
        line(d, arm, (arm[0], arm[1] - 0.35), 0.03)
        cx, cy = arm[0], arm[1] - 0.6
        fill(d, [(cx - 0.17, cy + 0.25), (cx + 0.17, cy + 0.25), (cx + 0.12, cy - 0.25), (cx - 0.12, cy - 0.25)])


def pole(d, x, h, lean=0.0):
    """A bare post with bars across it, leaning."""
    top = (x + lean * h, h)
    line(d, (x, -0.2), top, 0.12)
    for k, span in ((0.92, 1.1), (0.8, 0.8)):
        cx, cy = x + lean * h * k, h * k
        line(d, (cx - span, cy + span * lean * 0.6), (cx + span, cy - span * lean * 0.6), 0.07)


def canvas():
    m = Image.new('L', (W * SS, H * SS), 0)
    return m, ImageDraw.Draw(m)


def shrink(m):
    return m.resize((W, H), Image.LANCZOS)


# --- Painting ------------------------------------------------------------------------------------------------------

def stone(blotch, streak, mix=0.4, sy=1.0):
    """Rock's light and dark: blotches, and streaks running down it."""
    a = fractal(W, H, blotch, 6)
    b = Image.blend(noise(W, H, streak, streak * 10 * sy), noise(W, H, streak * 3, streak * 18 * sy), 0.5)
    return ImageOps.autocontrast(Image.blend(a, b, mix * 0.6), cutoff=1)


def mist(height, strength):
    """How much of the haze is over what stands at each height: all of `strength` at the floor, none from `height` up."""
    return vgrad(lambda y: strength * max(0.0, min(1.0, (height - y) / height)) ** 1.3)


def paint(base, mask, shade, dark, light, fog=None, haze=HAZE, rim=0.0, blur=0.0, opacity=1.0):
    """Lays what `mask` covers on `base`: `shade` from `dark` to `light`, hazed by `fog`, its upper edges lit by `rim`."""
    rgb = ImageOps.colorize(shade, hexc(dark), hexc(light))
    if rim:
        edge = ImageChops.subtract(mask, ImageChops.offset(mask, 0, 4)).filter(ImageFilter.GaussianBlur(1.2))
        rgb = Image.composite(Image.new('RGB', (W, H), hexc(light)), rgb, scaled(edge, rim))
    if fog is not None:
        rgb = Image.composite(Image.new('RGB', (W, H), haze), rgb, fog)
    if blur:
        rgb, mask = rgb.filter(ImageFilter.GaussianBlur(blur)), mask.filter(ImageFilter.GaussianBlur(blur))
    base.paste(rgb, (0, 0), scaled(mask, opacity) if opacity < 1 else mask)


def backdrop():
    # The sky: grey, darkest at the top, with heavy clouds low and smeared sideways.
    clouds = fractal(W, H, 420, 6, sx=2.6, sy=0.9)
    height = vgrad(lambda y: (1 - max(0.0, y) / TOP) ** 1.4)
    sky = ImageOps.colorize(Image.blend(height, clouds, 0.38), hexc('#26262b'), hexc('#9a989d'))
    img = sky

    # Far off, faint in the haze: ruins and thin crags, the city that was.
    m, d = canvas()
    x = LEFT
    while x < RIGHT:
        w = rnd.uniform(1.2, 3.6)
        if rnd.random() < 0.35:
            spire(d, x, w * 1.2, rnd.uniform(5, 12), rnd.uniform(-0.08, 0.08))
        else:
            ruin(d, x, w, rnd.uniform(4, 11), rnd.uniform(-0.03, 0.03))
        x += w * rnd.uniform(0.7, 1.6)
    skyline(d, [(LEFT, 2.5), (-30, 3.5), (-10, 2.2), (10, 3.8), (30, 2.6), (RIGHT, 3.2)], 1.0)
    paint(img, shrink(m), stone(90, 5), '#5c5b60', '#6a696e', mist(9, 0.7), haze='#6e6d72', blur=2.0, opacity=0.75)

    # Hills of broken rock behind, a few teeth of stone standing out of them.
    m, d = canvas()
    skyline(d, [(LEFT, 4), (-44, 7.5), (-36, 5), (-27, 8.5), (-20, 6), (-8, 4.5), (2, 6.2), (9, 4.8), (18, 7.5), (26, 5.5), (38, 9), (48, 6), (RIGHT, 7)], 1.6)
    for sx_, h in ((-33, 11), (-22, 9.5), (4, 8), (21, 10), (33, 12.5), (44, 9)):
        spire(d, sx_, rnd.uniform(1.8, 3.2), h, rnd.uniform(-0.1, 0.1))
    paint(img, shrink(m), stone(70, 5), '#4b4a4f', '#636267', mist(6, 0.72), haze='#6b6a6f', rim=0.35, blur=0.8)

    # The great crags: one to the left of the heroes, going up out of the picture; ruins to the right, behind the boss.
    m, d = canvas()
    skyline(d, [(LEFT, 9), (-48, 13), (-40, 7)], 1.4)
    skyline(d, [(-28, 0), (-25.5, 4.5), (-23, 7.8), (-21.5, 7.2), (-19.5, 10.5), (-17.5, 12), (-16.4, 15.5), (-14.6, 18.5), (-13.8, 17.6),
                (-12.6, 16.8), (-11.2, 13.4), (-9.8, 13.9), (-8.6, 11), (-7.2, 8.4), (-5.5, 7.6), (-3.8, 4.2), (-1.5, 2.2), (1.5, 0)], 0.45)
    spire(d, -16.8, 2.4, 20, 0.07, 0.25)
    spire(d, -9.4, 1.6, 15, -0.12, 0.18)
    for rx, w, h, holes in ((15, 2.6, 12, 2), (19, 3.4, 15.5, 3), (23.5, 2.2, 10, 1), (28, 3.8, 17, 3), (33, 2.8, 12.5, 2), (40, 4.2, 14, 2), (-31, 3, 11, 2), (-37, 3.6, 14, 2)):
        ruin(d, rx, w, h, rnd.uniform(-0.04, 0.04), holes)
    skyline(d, [(10, 0), (14, 2.4), (24, 3.4), (36, 2.6), (RIGHT, 3.8)], 0.7)
    paint(img, shrink(m), stone(55, 4), '#28272c', '#4f4e54', mist(4.5, 0.6), rim=0.7)

    # The fallen slab, a great plate of stone tipped up from the floor, its high end broken off; a piece of it beyond.
    m, d = canvas()
    under = ridge((-5, -0.3), (9.4, 3.4), 0.12, 6)
    end = ridge((9.4, 3.4), (10.4, 5.6), 0.4, 5)
    over = ridge((10.4, 5.6), (-5.6, 0.7), 0.1, 6)
    fill(d, under + end[1:] + over[1:])
    fill(d, [(12.2, -0.3), (16.8, -0.3), (16.2, 1.3), (13.4, 1.9)])
    slab = shrink(m)
    paint(img, slab, stone(40, 3, 0.25), '#38373c', '#5c5b60', mist(2.5, 0.45), rim=0.8)
    m, d = canvas()  # its top, catching the light
    fill(d, ridge((10.4, 5.6), (-5.6, 0.7), 0.06, 6) + ridge((-5.4, 0.95), (10.1, 5.95), 0.06, 6)[1:])
    paint(img, shrink(m), fractal(W, H, 30, 4), '#5f5e63', '#77767b', mist(2.5, 0.4))
    m, d = canvas()  # its cracks
    for _ in range(9):
        t = rnd.uniform(0.05, 0.95)
        x0, y0 = -5 + t * 14.8, -0.3 + t * 4.3
        pts = ridge((x0, y0 + 0.15), (x0 + rnd.uniform(-0.6, 0.6), y0 + rnd.uniform(0.6, 1.2)), 0.12, 4)
        d.line([(px(a), py(b)) for a, b in pts], fill=255, width=3)
    paint(img, ImageChops.multiply(shrink(m), slab), Image.new('L', (W, H), 0), '#1b1a1e', '#1b1a1e')

    # Near: posts left standing, dead trees, iron lamps along the right, and rubble all along the floor.
    m, d = canvas()
    pole(d, -5.5, 7.5, 0.06)
    pole(d, 3.2, 6.5, -0.11)
    pole(d, -38, 7, -0.05)
    for tx, h in ((-24, 3.2), (-11.5, 2.6), (1.0, 2.2), (13.5, 2.4), (36, 3.0), (-44, 2.8)):
        tree(d, tx, -0.2, math.pi / 2 + rnd.uniform(-0.25, 0.25), h, 0.32, 5)
    for lx, h, lean, broken in ((17.5, 6.2, -0.02, False), (22, 6.6, 0.05, False), (26.5, 5.4, -0.16, True), (31, 6.4, 0.03, False), (-30, 6, 0.08, False), (-49, 6.2, -0.04, False)):
        lamp(d, lx, h, lean, broken)
    keys, x = [], LEFT
    while x < RIGHT:
        keys.append((x, rnd.choice((-0.2, -0.1, 0.1, 0.3, 0.5, 0.9, 1.4)) * rnd.uniform(0.6, 1.1)))
        x += rnd.uniform(0.6, 4.5)
    fill(d, profile(keys + [(RIGHT, 0.2)], 0.35) + [(RIGHT, BOTTOM - 1), (LEFT, BOTTOM - 1)])
    paint(img, shrink(m), stone(25, 2, 0.2), '#1e1d21', '#333236', mist(1.6, 0.3), rim=0.4)

    # Mist along the floor, the same as the floor's haze where they meet; and grain over all, as if painted.
    img = Image.composite(Image.new('RGB', (W, H), HAZE), img, vgrad(lambda y: max(0.0, min(1.0, (1.3 - y) / 1.3)) ** 1.6))
    grain = noise(W, H, 1.2).convert('RGB')
    return Image.blend(img, grain, 0.035)


def ground():
    """One tile of the floor: dark cracked earth, wet in places, stones in it."""
    T = TILE
    shade = Image.blend(tfractal(T, 256, 7), tfractal(T, 32, 4), 0.3)
    img = ImageOps.colorize(shade, hexc('#1f1e21'), hexc('#3d3c40'))
    # Wet, smooth patches, a little lighter and bluer; and darker stains.
    wet = tfractal(T, 192, 5).point(lambda v: max(0, min(255, (v - 150) * 4)))
    img = Image.composite(Image.new('RGB', (T, T), hexc('#4d4e55')), img, scaled(wet.filter(ImageFilter.GaussianBlur(6)), 0.55))
    stain = tfractal(T, 128, 4).point(lambda v: max(0, min(255, (110 - v) * 4)))
    img = Image.composite(Image.new('RGB', (T, T), hexc('#171619')), img, scaled(stain.filter(ImageFilter.GaussianBlur(8)), 0.6))

    # Cracks: wandering lines, some forking, drawn again past each edge so they run on into the next tile.
    k = 2
    cracks = Image.new('L', (T * k, T * k), 0)
    d = ImageDraw.Draw(cracks)

    def crack(x, y, ang, steps, width):
        pts = [(x, y)]
        for _ in range(steps):
            ang += rnd.uniform(-0.45, 0.45)
            step = rnd.uniform(8, 20) * k
            x, y = x + math.cos(ang) * step, y + math.sin(ang) * step
            pts.append((x, y))
            if width > 1 and rnd.random() < 0.08:
                crack(x, y, ang + rnd.choice((-1, 1)) * rnd.uniform(0.6, 1.2), steps // 3, width - 1)
        for ox in (-T * k, 0, T * k):
            for oy in (-T * k, 0, T * k):
                d.line([(a + ox, b + oy) for a, b in pts], fill=255, width=width * k, joint='curve')

    for _ in range(22):
        crack(rnd.uniform(0, T * k), rnd.uniform(0, T * k), rnd.uniform(0, 2 * math.pi), rnd.randint(10, 40), rnd.choice((1, 2, 2, 3)))
    cracks = cracks.resize((T, T), Image.LANCZOS)
    lip = ImageChops.offset(cracks, 1, 2).filter(ImageFilter.GaussianBlur(1))
    img = Image.composite(Image.new('RGB', (T, T), hexc('#48474c')), img, scaled(lip, 0.35))
    img = Image.composite(Image.new('RGB', (T, T), hexc('#0f0e11')), img, scaled(cracks, 0.9))

    # Stones and grit.
    stones = Image.new('L', (T, T), 0)
    lights = Image.new('L', (T, T), 0)
    ds, dl = ImageDraw.Draw(stones), ImageDraw.Draw(lights)
    for _ in range(900):
        x, y, r = rnd.uniform(0, T), rnd.uniform(0, T), rnd.uniform(0.8, 4.5) * rnd.choice((1, 1, 1, 2))
        for ox in (-T, 0, T):
            for oy in (-T, 0, T):
                box = [x + ox - r, y + oy - r * 0.7, x + ox + r, y + oy + r * 0.7]
                ds.ellipse(box, fill=255)
                dl.ellipse([box[0] + r * 0.3, box[1], box[2] - r * 0.2, box[3] - r * 0.6], fill=255)
    img = Image.composite(Image.new('RGB', (T, T), hexc('#19181b')), img, scaled(stones.filter(ImageFilter.GaussianBlur(0.6)), 0.7))
    img = Image.composite(Image.new('RGB', (T, T), hexc('#58575c')), img, scaled(lights.filter(ImageFilter.GaussianBlur(0.6)), 0.45))
    return Image.blend(img, tiled(T, 2).convert('RGB'), 0.04)


if __name__ == '__main__':
    out = Path(sys.argv[1] if len(sys.argv) > 1 else 'public/technomagic/scenery/wasteland')
    out.mkdir(parents=True, exist_ok=True)
    backdrop().save(out / 'backdrop.webp', quality=85, method=6)
    ground().save(out / 'ground.webp', quality=88, method=6)
    print(f'{out}/backdrop.webp {W}x{H}, {out}/ground.webp {TILE}x{TILE}')

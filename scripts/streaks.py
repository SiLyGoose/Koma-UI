"""
Makes the streaked edges of the page transition's panel (src/shared/transition/head.css): thin bands
of dark, each reaching its own length out of the panel and fading away, like the panel is smeared
across as it moves. Prints the two mask pictures (the right edge, then the left, its mirror) as data
URLs, to paste into the `mask` there. The same seed gives the same streaks.

    python scripts/streaks.py
"""
import random
import urllib.parse

random.seed(7)
HEIGHT = 540  # the picture repeats down the edge every this many pixels
SOLID = 22  # every streak is fully dark this far (of 100) out of the panel, then fades to its own length

bands = []
y, length = 0, 60
while y < HEIGHT:
    h = min(random.choice([3, 4, 4, 5, 6, 8, 10, 12, 14]), HEIGHT - y)
    # Neighbours stay close, with the odd long streak or short one.
    length = max(36, min(100, length + random.uniform(-22, 22)))
    if random.random() < 0.12:
        length = random.uniform(85, 100)
    if random.random() < 0.10:
        length = random.uniform(36, 46)
    length = round(length / 4) * 4  # streaks of about the same length share a fade
    bands.append((y, h, length))
    y += h
lengths = sorted({length for _, _, length in bands})


def svg(mirror: bool) -> str:
    turn = " x1='1' x2='0'" if mirror else ''
    fades = ''.join(f"<linearGradient id='g{n}'{turn}><stop offset='{round(SOLID / n, 3)}'/><stop offset='1' stop-opacity='0'/></linearGradient>" for n in lengths)
    # A hair taller than each band, so no hairline shows between two.
    rects = ''.join(f"<rect x='{100 - n if mirror else 0}' y='{top}' width='{n}' height='{h + 0.6}' fill='url(#g{n})'/>" for top, h, n in bands)
    return f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 {HEIGHT}' preserveAspectRatio='none'><defs>{fades}</defs>{rects}</svg>"


def data_url(text: str) -> str:
    return 'data:image/svg+xml,' + urllib.parse.quote(text, safe=" =:/'.,()-")


print(data_url(svg(False)))
print()
print(data_url(svg(True)))

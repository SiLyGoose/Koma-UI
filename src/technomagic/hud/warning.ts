import { BLEND, END, LAYERS, START } from './warning-anim';
import { el } from './dom';

/*
 * King's Raid's image pattern alarm, "WARNING" (its PatternAlarm's Image: ./warning-anim.ts, made by
 * KR-extracted/scripts/tm-warning.py): its letters flown in and popped, its red ground flashed, two stings slashed across
 * and their glows (Anim_RaidWarning_Start), then from BLEND.at each letter tipped and squashed away in turn
 * (Anim_RaidWarning_End, blended into as Unity's Animator does: each value from one clip's to the other's, or from the
 * layer's own where a clip leaves it be). Drawn at any time into it, so it is where it would be however the page was.
 */

/** A layer: its picture (public/kr/ui/battle/warning/), size, depth, whether it is drawn added on, and its own position, scale and alpha. */
export interface WarningLayer {
  name: string;
  picture: string;
  size: readonly number[];
  depth: number;
  add: boolean;
  at: readonly number[];
  scale: readonly number[];
  alpha: number;
}

/** A clip: its length, and by layer, by what it moves, its keys ([time, a, b, c, d]: d + c·t + b·t² + a·t³ from the key's time). */
export interface WarningClip {
  length: number;
  curves: Readonly<Record<string, Readonly<Record<string, readonly (readonly number[])[]>>>>;
}

/** How wide the text alarm's panel is in King's Raid's px: the size the alarm's box is drawn at stands for it (../styles/alarm.css). */
const PANEL = 975;

/** A curve's value at `t` (undefined: the clip doesn't move it). */
function valueOf(keys: readonly (readonly number[])[] | undefined, t: number): number | undefined {
  if (!keys || keys.length === 0) return undefined;
  let key = keys[0] as readonly number[];
  for (const one of keys) if ((one[0] as number) <= t) key = one;
  const [at, a, b, c, d] = key as [number, number, number, number, number];
  const dt = Math.max(0, t - at);
  return ((a * dt + b) * dt + c) * dt + d;
}

export interface WarningShow {
  /** Drawn `t` seconds in (null: not drawn). */
  draw(t: number | null): void;
}

/** The alarm's layers, put in `root` (made the first time it is drawn), as big as the alarm's box it is in says. */
export function makeWarning(root: HTMLElement): WarningShow {
  let made: { layer: WarningLayer; image: HTMLImageElement }[] | null = null;
  /** Page px for one of King's Raid's: the box's width over the panel's. */
  let k = 0;
  const box = root.parentElement ?? root;
  const size = (): void => {
    k = box.clientWidth / PANEL;
    for (const { layer, image } of made ?? []) {
      image.style.width = `${(layer.size[0] as number) * k}px`;
      image.style.height = `${(layer.size[1] as number) * k}px`;
    }
  };
  const make = (): NonNullable<typeof made> => {
    const all = LAYERS.map((layer) => {
      // (An additive one's picture is already made clear where it was black: KR-extracted/scripts/tm-warning.py.)
      const image = el('img', 'tm-warning-layer');
      image.src = `/kr/ui/battle/warning/${layer.picture}.webp`;
      image.alt = '';
      image.draggable = false;
      image.style.zIndex = String(layer.depth);
      return { layer, image };
    });
    root.append(...all.map(({ image }) => image));
    new ResizeObserver(size).observe(box);
    return all;
  };
  return {
    draw(t) {
      root.hidden = t === null;
      if (t === null) return;
      if (!made) {
        made = make();
        size();
      }
      // (Into the end's blend: how far, and how far into the end.)
      const w = Math.min(1, Math.max(0, (t - BLEND.at) / BLEND.over));
      const startT = Math.min(t, START.length);
      const endT = Math.min(Math.max(0, t - BLEND.at), END.length);
      for (const { layer, image } of made) {
        const start = START.curves[layer.name] ?? {};
        const end = END.curves[layer.name] ?? {};
        const own: Record<string, number> = { 'pos.x': layer.at[0] as number, 'pos.y': layer.at[1] as number, 'scale.x': layer.scale[0] as number, 'scale.y': layer.scale[1] as number, turn: 0, alpha: layer.alpha, active: 1 };
        const get = (what: string): number => {
          const from = (w < 1 ? valueOf(start[what], startT) : undefined) ?? own[what] ?? 0;
          if (w <= 0) return from;
          const to = valueOf(end[what], endT) ?? own[what] ?? 0;
          return from + (to - from) * w;
        };
        const alpha = get('active') >= 0.5 ? Math.min(1, Math.max(0, get('alpha'))) : 0;
        image.style.opacity = String(alpha);
        if (alpha <= 0) continue;
        image.style.transform = `translate(-50%, -50%) translate(${get('pos.x') * k}px, ${-get('pos.y') * k}px) rotate(${-get('turn')}deg) scale(${get('scale.x')}, ${get('scale.y')})`;
      }
    },
  };
}

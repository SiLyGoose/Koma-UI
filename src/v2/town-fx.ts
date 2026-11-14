import { TOWN_FX_SHEETS, type TownFxSheet } from './kr-town';

/*
 * The town's little movements: King's Raid's town flipbooks (Effect_UI_TownSprite_*: chimney and forge smoke, the forge's
 * fire, braziers, pennants and banners), each stepped through its frames as the game's script did (it isn't in the
 * playtest's bundles, nor where the game put them on this map: they were made for its older town). Put by hand on what
 * Orvelia's picture has painted there. Each is a strip of frames slid along inside a window one frame wide (a transform
 * the compositor moves), stepped by the town's own frames (./town.ts draw): only those in view, and only when their frame
 * changes. Not CSS animations: the town draws a frame every frame (its walker), and with it Chrome stepped every running
 * animation on the page's thread, three style passes a frame for these alone, standing still or not.
 */

interface Placed {
  sheet: TownFxSheet;
  /** Where it goes on the map (pixels): the bottom middle of its picture (`centre`: its middle). */
  x: number;
  y: number;
  /** How wide its picture is there (map pixels). */
  width: number;
  centre?: boolean;
  /** Mirrored (a pennant flying the other way). */
  flip?: boolean;
  /** Frames a second. */
  fps: number;
  /** How far into its loop it starts (0 to 1), so neighbours don't move as one. */
  phase?: number;
  /** Drawn added onto the picture (a glow). */
  glow?: boolean;
}

const PLACED: readonly Placed[] = [
  // Chimney smoke: the castle's, the pub's, and the house in front of the forge.
  { sheet: 'Smoke', x: 857, y: 1078, width: 40, fps: 7 },
  { sheet: 'Smoke', x: 945, y: 1108, width: 40, fps: 7, phase: 0.45 },
  { sheet: 'Smoke', x: 3168, y: 1954, width: 40, fps: 7, phase: 0.2 },
  { sheet: 'Smoke', x: 3373, y: 1924, width: 40, fps: 7, phase: 0.6 },
  { sheet: 'Smoke', x: 3602, y: 2014, width: 40, fps: 7, phase: 0.8 },
  { sheet: 'Smoke', x: 2597, y: 2870, width: 34, fps: 7, phase: 0.35 },
  // The forge: its two chimneys, its furnace's fire, the brazier by its door.
  { sheet: 'ForgeSmoke', x: 2460, y: 2436, width: 90, fps: 8 },
  { sheet: 'ForgeSmoke', x: 2418, y: 2508, width: 80, fps: 8, phase: 0.5 },
  { sheet: 'ForgeLight', x: 2413, y: 2800, width: 46, centre: true, fps: 8, glow: true },
  { sheet: 'StreetLight', x: 2278, y: 2765, width: 30, fps: 10 },
  // The arena: its braziers and its banners.
  { sheet: 'StreetLight', x: 2668, y: 1650, width: 30, fps: 10, phase: 0.3 },
  { sheet: 'StreetLight', x: 3036, y: 1595, width: 30, fps: 10, phase: 0.6 },
  { sheet: 'Flag2', x: 2493, y: 1562, width: 18, centre: true, fps: 6 },
  { sheet: 'Flag1', x: 2582, y: 1637, width: 18, centre: true, fps: 6, phase: 0.5 },
  // The castle's pennants.
  { sheet: 'RedFlag', x: 258, y: 1362, width: 30, centre: true, flip: true, fps: 6 },
  { sheet: 'RedFlag', x: 926, y: 1440, width: 30, centre: true, flip: true, fps: 6, phase: 0.5 },
];

const FX = `${import.meta.env.BASE_URL}kr/town/fx/`;

export interface TownFx {
  /** Each in view (map pixels: left, top, right, bottom) on its frame at `now` (ms). */
  draw(now: number, left: number, top: number, right: number, bottom: number): void;
}

/** The town's flipbooks, put into `world` (the map's layer, in its pixels). */
export function addTownFx(world: HTMLElement): TownFx {
  const all: { strip: HTMLElement; frames: number; fps: number; phase: number; x0: number; y0: number; x1: number; y1: number; w: number; shown: number }[] = [];
  for (const placed of PLACED) {
    const { file, frames, cell, box } = TOWN_FX_SHEETS[placed.sheet];
    const k = placed.width / (box[2] - box[0]);
    const [w, h] = [cell[0] * k, cell[1] * k];
    // (Mirrored, its picture's box is mirrored in its frame.)
    const middle = placed.flip ? cell[0] - (box[0] + box[2]) / 2 : (box[0] + box[2]) / 2;
    const anchor = placed.centre ? (box[1] + box[3]) / 2 : box[3];
    const [left, top] = [placed.x - middle * k, placed.y - anchor * k];
    const frame = document.createElement('span');
    frame.className = `v2-fx${placed.glow ? ' glow' : ''}${placed.flip ? ' flip' : ''}`;
    frame.style.cssText = `left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px`;
    const strip = document.createElement('span');
    strip.className = 'v2-fx-strip';
    strip.style.cssText = `width:${(w * frames).toFixed(1)}px;background-image:url("${FX}${file}.webp")`;
    frame.append(strip);
    world.append(frame);
    all.push({ strip, frames, fps: placed.fps, phase: placed.phase ?? 0, x0: left, y0: top, x1: left + w, y1: top + h, w, shown: 0 });
  }
  return {
    draw(now, left, top, right, bottom) {
      for (const fx of all) {
        if (fx.x1 < left || fx.x0 > right || fx.y1 < top || fx.y0 > bottom) continue;
        const at = Math.floor(((now / 1000) * fx.fps + fx.phase * fx.frames) % fx.frames);
        if (at === fx.shown) continue;
        fx.shown = at;
        fx.strip.style.transform = `translate3d(${(-at * fx.w).toFixed(1)}px, 0, 0)`;
      }
    },
  };
}

import { currentCharacter } from '../../shared/characters';
import type { PinecraftOre, PinecraftPickaxe } from '../protocol';

/*
 * The pictures of Pinecraft's blocks, in public/pinecraft/blocks as block_<name>.png: dirt, stone,
 * bedrock and each ore (block_coal.png, block_iron.png and so on). An ore without one has a stand-in
 * drawn here (stone with gems of the ore's colour in it), and bedrock without one is made from the
 * stone. A block being broken has public/pinecraft/cracks/crack_01.png to crack_04.png over it, more
 * cracked the closer it is to breaking. The character's pickaxe is
 * public/pinecraft/pickaxes/pickaxe_<name>.png (pickaxe_wood.png, pickaxe_gold.png,
 * pickaxe_diamond.png, pickaxe_ruby.png, pickaxe_amethyst.png), drawn upright: head at the top, handle down the middle.
 */

export type BlockTexture = 'dirt' | 'stone' | 'bedrock' | PinecraftOre;

export const ORES: readonly PinecraftOre[] = ['coal', 'iron', 'gold', 'diamond', 'emerald', 'amethyst', 'ruby'];

/** Each ore's colours: the gem, its outline, and its shine. Also used for the ore tooltip, the sparks and the "+points". */
export const ORE_COLOR: Readonly<Record<PinecraftOre, { gem: string; edge: string; shine: string }>> = {
  coal: { gem: '#2b2b30', edge: '#151518', shine: '#6d6d78' },
  iron: { gem: '#d9ab8a', edge: '#8c6248', shine: '#f5e1d2' },
  gold: { gem: '#f5c542', edge: '#a87a12', shine: '#fff1b0' },
  diamond: { gem: '#5fe0f2', edge: '#1f8ea3', shine: '#e6fcff' },
  ruby: { gem: '#e33a5a', edge: '#8c1530', shine: '#ffc2cf' },
  amethyst: { gem: '#a66bf0', edge: '#5b2d9c', shine: '#ead9ff' },
  emerald: { gem: '#2fd07a', edge: '#127a41', shine: '#c6ffdf' },
};

/** Stand-in colours for dirt and stone, used while (or if) their pictures don't load. */
const FLAT = { dirt: '#6b4f35', stone: '#77787b' } as const;

const SIZE = 128;

const textures = new Map<BlockTexture, CanvasImageSource>();

/** The picture of a block, once loaded (the stand-in colours until then). */
export const texture = (name: BlockTexture): CanvasImageSource | undefined => textures.get(name);

const crackImages: (HTMLImageElement | null)[] = [];

/** The cracks over a block `progress` of the way (0 to 1) to breaking, once loaded. */
export function crack(progress: number): HTMLImageElement | null | undefined {
  if (progress <= 0) return null;
  return crackImages[progress < 0.2 ? 0 : progress < 0.5 ? 1 : progress < 0.8 ? 2 : 3];
}

function canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  return [c, c.getContext('2d') as CanvasRenderingContext2D];
}

function flat(color: string): HTMLCanvasElement {
  const [c, g] = canvas();
  g.fillStyle = color;
  g.fillRect(0, 0, SIZE, SIZE);
  return c;
}

/** Loads a picture, or null when there isn't one (a missing file comes back as a page, which isn't a picture). */
function load(path: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
    img.onerror = () => resolve(null);
    img.src = `${import.meta.env.BASE_URL}${path}`;
  });
}

/** A stand-in for bedrock.png: stone, darker and bluish, with a few cracks (it can't be broken). */
function bedrock(stone: CanvasImageSource): HTMLCanvasElement {
  const [c, g] = canvas();
  g.drawImage(stone, 0, 0, SIZE, SIZE);
  g.fillStyle = 'rgba(22, 30, 40, 0.5)';
  g.fillRect(0, 0, SIZE, SIZE);
  g.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  g.lineWidth = 5;
  g.lineCap = 'round';
  for (const [x1, y1, x2, y2] of [[20, 30, 60, 50], [70, 90, 110, 70], [30, 100, 50, 80]] as const) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }
  return c;
}

/** A gem: a rounded six-sided stone with an outline and a shine. */
export function drawGem(g: CanvasRenderingContext2D, ore: PinecraftOre, cx: number, cy: number, r: number): void {
  const { gem, edge, shine } = ORE_COLOR[ore];
  g.beginPath();
  for (let k = 0; k < 6; k++) {
    const angle = (k * Math.PI) / 3 + Math.PI / 6;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r * 0.85;
    if (k === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fillStyle = gem;
  g.lineJoin = 'round';
  g.lineWidth = Math.max(2, r * 0.28);
  g.strokeStyle = edge;
  g.stroke();
  g.fill();
  g.beginPath();
  g.ellipse(cx - r * 0.3, cy - r * 0.3, r * 0.28, r * 0.18, -0.6, 0, Math.PI * 2);
  g.fillStyle = shine;
  g.fill();
}

/** The stand-in for an ore: stone with a scatter of gems. */
function oreStandIn(stone: CanvasImageSource, ore: PinecraftOre): HTMLCanvasElement {
  const [c, g] = canvas();
  g.drawImage(stone, 0, 0, SIZE, SIZE);
  for (const [x, y, r] of [[34, 36, 15], [88, 30, 12], [62, 70, 17], [28, 94, 12], [96, 92, 14]] as const) drawGem(g, ore, x, y, r);
  return c;
}

const PICKAXES: readonly PinecraftPickaxe[] = ['wood', 'gold', 'diamond', 'ruby', 'amethyst'];

const pickaxeImages = new Map<PinecraftPickaxe, HTMLImageElement>();

/** The picture of a pickaxe, once loaded (the wooden one while it isn't; undefined when neither is). */
export const pickaxeImage = (name: PinecraftPickaxe): HTMLImageElement | undefined => pickaxeImages.get(name) ?? pickaxeImages.get('wood');

let characterImg: HTMLImageElement | null = null;

/** The member's character's picture (public/characters/<id>/sprite.png, ../../shared/characters.ts), once loaded. */
export const characterImage = (): HTMLImageElement | null => characterImg;

let keys: HTMLCanvasElement | null = null;

/** How to play (public/pinecraft/keys.png: WASD / arrows, "MOVE & MINE"), trimmed to what's drawn, once loaded. */
export const keysPicture = (): HTMLCanvasElement | null => keys;

/** Loads the how-to-play picture, cut down to its drawing (the file has a wide empty margin). */
export async function loadKeysPicture(): Promise<void> {
  const img = await load('pinecraft/keys.png');
  if (!img) return;
  const full = document.createElement('canvas');
  full.width = img.naturalWidth;
  full.height = img.naturalHeight;
  const fg = full.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  fg.drawImage(img, 0, 0);
  const { data, width, height } = fg.getImageData(0, 0, full.width, full.height);
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) < 16) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < left) return;
  const cut = document.createElement('canvas');
  cut.width = right - left + 1;
  cut.height = bottom - top + 1;
  (cut.getContext('2d') as CanvasRenderingContext2D).drawImage(full, left, top, cut.width, cut.height, 0, 0, cut.width, cut.height);
  keys = cut;
}

/** Loads every block's picture. Resolves once they are all in (the stand-ins are there straight away). */
export async function loadTextures(): Promise<void> {
  textures.set('dirt', flat(FLAT.dirt));
  textures.set('stone', flat(FLAT.stone));
  const cracks = Promise.all([1, 2, 3, 4].map((k) => load(`pinecraft/cracks/crack_0${k}.png`)));
  for (const name of PICKAXES) {
    void load(`pinecraft/pickaxes/pickaxe_${name}.png`).then((img) => {
      if (img) pickaxeImages.set(name, img);
    });
  }
  void load(currentCharacter().sprite.replace(/^\//, '')).then((img) => {
    characterImg = img;
  });
  const [dirt, stone, bedrockImg, ...ores] = await Promise.all([
    load('pinecraft/blocks/block_dirt.png'),
    load('pinecraft/blocks/block_stone.png'),
    load('pinecraft/blocks/block_bedrock.png'),
    ...ORES.map((ore) => load(`pinecraft/blocks/block_${ore}.png`)),
  ]);
  crackImages.push(...(await cracks));
  const dirtImg = dirt ?? (textures.get('dirt') as CanvasImageSource);
  const stoneImg = stone ?? (textures.get('stone') as CanvasImageSource);
  textures.set('dirt', dirtImg);
  textures.set('stone', stoneImg);
  textures.set('bedrock', bedrockImg ?? bedrock(stoneImg));
  ORES.forEach((ore, k) => textures.set(ore, ores[k] ?? oreStandIn(stoneImg, ore)));
}

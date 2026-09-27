import type { PinecraftOre } from './protocol';

/*
 * The pictures of Pinecraft's blocks. Dirt and stone are drawings in public/blocks. An ore uses
 * public/blocks/<ore>.png when there is one (coal.png, iron.png, gold.png, diamond.png, ruby.png,
 * emerald.png), and until then a stand-in drawn here: stone with gems of the ore's colour in it.
 * Bedrock is made from the stone. A block being broken has public/cracks/crack_01.png to crack_04.png
 * over it, more cracked the closer it is to breaking.
 */

export type BlockTexture = 'dirt' | 'stone' | 'bedrock' | PinecraftOre;

export const ORES: readonly PinecraftOre[] = ['coal', 'iron', 'gold', 'diamond', 'emerald', 'ruby'];

/** Each ore's colours: the gem, its outline, and its shine. Also used for the legend, the sparks and the "+points". */
export const ORE_COLOR: Readonly<Record<PinecraftOre, { gem: string; edge: string; shine: string }>> = {
  coal: { gem: '#2b2b30', edge: '#151518', shine: '#6d6d78' },
  iron: { gem: '#d9ab8a', edge: '#8c6248', shine: '#f5e1d2' },
  gold: { gem: '#f5c542', edge: '#a87a12', shine: '#fff1b0' },
  diamond: { gem: '#5fe0f2', edge: '#1f8ea3', shine: '#e6fcff' },
  ruby: { gem: '#e33a5a', edge: '#8c1530', shine: '#ffc2cf' },
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

/** Stone, darker and bluish, with a few cracks: it can't be broken. */
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

/** Loads every block's picture. Resolves once they are all in (the stand-ins are there straight away). */
export async function loadTextures(): Promise<void> {
  textures.set('dirt', flat(FLAT.dirt));
  textures.set('stone', flat(FLAT.stone));
  const cracks = Promise.all([1, 2, 3, 4].map((k) => load(`cracks/crack_0${k}.png`)));
  const [dirt, stone, ...ores] = await Promise.all([load('blocks/dirt.png'), load('blocks/stone.png'), ...ORES.map((ore) => load(`blocks/${ore}.png`))]);
  crackImages.push(...(await cracks));
  const dirtImg = dirt ?? (textures.get('dirt') as CanvasImageSource);
  const stoneImg = stone ?? (textures.get('stone') as CanvasImageSource);
  textures.set('dirt', dirtImg);
  textures.set('stone', stoneImg);
  textures.set('bedrock', bedrock(stoneImg));
  ORES.forEach((ore, k) => textures.set(ore, ores[k] ?? oreStandIn(stoneImg, ore)));
}

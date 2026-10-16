import type { Portrait } from '../assets';

/*
 * A skin's own picture made into what its card shows: its head, and under it the rest of the picture at
 * that size, its body going down behind the card.
 */

/** The picture for a card is this many pixels across, and this many times as tall. */
const FACE = 320;
const BODY = 1.7;

/**
 * Each picture's head on its card (by its file) where its crop takes in more or less round its face than the
 * others' do (their crops are shared with the site's pages, so they are left as they are): its crop drawn `zoom`
 * times as big, its middle moved `x` and `y` crop sizes (right and down). Matched to Annette_Halloween's: each
 * face about as big as hers and where hers is, its hair, horns or hood making it look no bigger than hers.
 */
const CARD: Readonly<Record<string, { zoom: number; x: number; y: number }>> = {
  'Kirze.png': { zoom: 1.03, x: 0.08, y: -0.08 },
  'Kirze_Glory.png': { zoom: 1.15, x: 0.12, y: 0.11 },
  'Klaus.png': { zoom: 0.98, x: 0.01, y: -0.02 },
  'Fallen_Frey.png': { zoom: 0.77, x: 0, y: 0.13 },
  'Gremory.png': { zoom: 0.84, x: -0.04, y: 0.16 },
  'Gremory_DailyLook.png': { zoom: 0.91, x: 0, y: -0.11 },
  'Annette.png': { zoom: 1.02, x: -0.01, y: -0.03 },
  'Morrah.png': { zoom: 1.07, x: 0.03, y: 0.12 },
  'Laias.png': { zoom: 1.06, x: -0.06, y: 0.01 },
  'Seria.png': { zoom: 0.93, x: -0.09, y: -0.1 },
  'Seria_Christmas.png': { zoom: 1.14, x: -0.11, y: -0.24 },
  'Ezekiel.png': { zoom: 1.04, x: -0.01, y: 0.11 },
  'Lorraine.png': { zoom: 1.06, x: -0.07, y: 0.11 },
  'Lorraine_Christmas.png': { zoom: 1.14, x: 0.02, y: -0.06 },
  'Valance.png': { zoom: 1.42, x: -0.02, y: -0.13 },
};

/**
 * The meter's picture of a hero is this many pixels square, and shows this much round its face square
 * (in face sizes) when its portrait doesn't say its own (Portrait.head, shown as it is): the face filling
 * it, as the game's DPS list has it.
 */
const HEAD = 96;
const AROUND = 1.08;

/** Cuts the meter's picture (a data: address) out of the one at `address`: its face close up. Null when it can't be read. */
export async function cutHead(address: string, portrait: Portrait): Promise<string | null> {
  const crop = portrait.head ?? portrait.crop;
  const around = portrait.head ? 1 : AROUND;
  const picture = new Image();
  picture.src = address;
  try {
    await picture.decode();
  } catch {
    return null;
  }
  const cut = document.createElement('canvas');
  cut.width = cut.height = HEAD;
  const pen = cut.getContext('2d');
  if (!pen) return null;
  const side = crop.size * around;
  pen.drawImage(picture, crop.x + crop.size / 2 - side / 2, crop.y + crop.size / 2 - side / 2, side, side, 0, 0, HEAD, HEAD);
  return cut.toDataURL();
}

/** Cuts the card's picture (a data: address) out of the one at `address`, `portrait`'s (its head in its crop). Null when it can't be read. */
export async function cutFace(address: string, portrait: Portrait): Promise<string | null> {
  const picture = new Image();
  picture.src = address;
  try {
    await picture.decode();
  } catch {
    return null;
  }
  const cut = document.createElement('canvas');
  cut.width = FACE;
  cut.height = FACE * BODY;
  const pen = cut.getContext('2d');
  if (!pen) return null;
  // Its head in from the left and top, smaller than the picture is wide; the rest of the picture is what is round it, at that size: its body, down behind its card.
  const head = { x: FACE * 0.21, y: FACE * 0.13, size: FACE * 0.66 };
  // Its crop there, as big and as placed as its card has it.
  const { crop } = portrait;
  const fit = CARD[portrait.file] ?? { zoom: 1, x: 0, y: 0 };
  const size = head.size * fit.zoom;
  const at = { x: head.x + (head.size - size) / 2 + fit.x * head.size, y: head.y + (head.size - size) / 2 + fit.y * head.size };
  const each = crop.size / size;
  pen.drawImage(picture, crop.x - at.x * each, crop.y - at.y * each, cut.width * each, cut.height * each, 0, 0, cut.width, cut.height);
  // Only as wide as its head and shoulders: fading out a little either side of its head.
  const edge = head.size * 0.12;
  const left = (head.x - edge) / cut.width;
  const right = Math.min(1, (head.x + head.size * 1.2) / cut.width);
  const shown = pen.createLinearGradient(0, 0, cut.width, 0);
  shown.addColorStop(left, 'transparent');
  shown.addColorStop(left + edge / cut.width, '#000');
  shown.addColorStop(right - edge / cut.width, '#000');
  shown.addColorStop(right, 'transparent');
  pen.globalCompositeOperation = 'destination-in';
  pen.fillStyle = shown;
  pen.fillRect(0, 0, cut.width, cut.height);
  return cut.toDataURL();
}

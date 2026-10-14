import type { Crop, Portrait } from '../assets';

/*
 * A skin's own picture made into what its card shows: its head, and under it the rest of the picture at
 * that size, its body going down behind the card.
 */

/** The picture for a card is this many pixels across, and this many times as tall. */
const FACE = 320;
const BODY = 1.7;

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

/** Cuts the card's picture (a data: address) out of the one at `address`, whose head is in `crop`. Null when it can't be read. */
export async function cutFace(address: string, crop: Crop): Promise<string | null> {
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
  const each = crop.size / head.size;
  pen.drawImage(picture, crop.x - head.x * each, crop.y - head.y * each, cut.width * each, cut.height * each, 0, 0, cut.width, cut.height);
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

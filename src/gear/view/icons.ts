import { itemIcons } from '../../shared/items';
import { blurIndex } from '../../shared/items/blur';

/*
 * King's Raid's hero gear's pictures on the gear page: the bot's gear doesn't say their icons (its hero gear, on the heroes
 * page, does), so they're read from the items' blurred pictures' index (../../shared/items/blur.ts: King's Raid's icons by
 * item id, asked for as this page loads, so they're mostly known before the gear is), or, where there's none (`yarn dev`),
 * from the site's own King's Raid data (../../technomagic/sim/gear/kr-data.ts, as the raids' gear samples read it).
 */

const loading: Promise<void> = blurIndex().then(async (index) => {
  const icons = index?.kr ?? Object.fromEntries((await fromData()).map((piece) => [piece.id, piece.icon]));
  for (const [id, icon] of Object.entries(icons)) if (!itemIcons.has(id)) itemIcons.set(id, icon);
});

/** Every King's Raid piece and artifact, with its icon (where the index has none). */
async function fromData(): Promise<readonly { id: string; icon: string }[]> {
  const { KR_PIECES, KR_ARTIFACTS } = await import('../../technomagic/sim/gear/kr-data');
  return [...KR_PIECES, ...KR_ARTIFACTS];
}

let waiting = false;

/** Every King's Raid piece's and artifact's icon, known to the cards (itemIcons): `then` once they are, if they weren't yet. */
export function loadKrIcons(then: () => void): void {
  if (waiting) return;
  waiting = true;
  void loading.then(then);
}

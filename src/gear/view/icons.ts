import { itemIcons } from '../../shared/items';

/*
 * King's Raid's hero gear's pictures on the gear page: the bot's gear doesn't say their icons (its hero gear, on the heroes
 * page, does), so they're read from the site's own King's Raid data (../../technomagic/sim/gear/kr-data.ts, as the raids'
 * gear samples read it), only once some is shown.
 */

let loading: Promise<void> | null = null;

/** Every King's Raid piece's and artifact's icon, known to the cards (itemIcons): `then` once they are, the first time. */
export function loadKrIcons(then: () => void): void {
  loading ??= import('../../technomagic/sim/gear/kr-data').then(({ KR_PIECES, KR_ARTIFACTS }) => {
    for (const piece of [...KR_PIECES, ...KR_ARTIFACTS]) if (!itemIcons.has(piece.id)) itemIcons.set(piece.id, piece.icon);
    then();
  });
}

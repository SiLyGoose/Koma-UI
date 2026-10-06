/*
 * The chips: how one looks (chips.ts), the rack (rack.ts), dragging one (drag.ts), the stacks
 * on a spot (piles.ts) and putting them down or taking them back (betting.ts).
 */

export { chipEl, stackChips } from './chips';
export { startDrag } from './drag';
export { place, sendBets, spotsIn, takeBack, whyNot } from './betting';

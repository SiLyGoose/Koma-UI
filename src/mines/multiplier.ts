import { points } from '../shared/util';
import type { Lobby } from './protocol';

export const TILES = 25;

export const times = (n: number): string => `${n.toFixed(2)}x`;

/** The multiplier after `gems` gems with `mines` mines, worked out the way the bot does (for showing what a round can pay). */
export function multiplierFor(l: Lobby, mines: number, gems: number): number {
  if (gems <= 0) return 1;
  const span = l.maxMines - l.minMines;
  const edge = l.edgeFewest + (l.edgeMost - l.edgeFewest) * (span > 0 ? (mines - l.minMines) / span : 1);
  let odds = 1;
  for (let i = 0; i < gems; i++) odds *= (TILES - i) / (TILES - mines - i);
  return Math.min(l.maxMultiplier, Math.floor((1 - edge) * odds * 100 + 1e-9) / 100);
}

/** The most a round with `mines` mines can pay, as a multiplier: every gem found, or the cap, whichever comes first. */
const bestMultiplier = (l: Lobby, mines: number): number => multiplierFor(l, mines, TILES - mines);

/** The most a bet of `bet` can win with `mines` mines, shown as "12,400 (24.75x)". */
export function maxPayoutText(lobby: Lobby | null, bet: number, mines: number): string {
  if (!lobby || !(bet > 0)) return '–';
  return `${points(Math.round(bet * bestMultiplier(lobby, mines)))} (${times(bestMultiplier(lobby, mines))})`;
}

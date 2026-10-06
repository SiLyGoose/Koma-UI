import { sleep } from '../shared/util';
import { startTable } from '../table/table';
import { buildBoard, hit, spots } from './board';
import { COLOR_NAME } from './colors';
import { renderSpot } from './marker';
import type { RouletteRoundView, RoundView, Spot } from './protocol';
import './roulette.css';
import { buildWheel, RESULT_MS, showNumber, showRecent, SPIN_MS, turnTo } from './wheel';

/*
 * Roulette in the browser, at a shared table (../table/table.ts does the table: the chips, the
 * players, the countdown and the bot). This is the felt: the wheel (wheel.ts), spun when the round is
 * dealt, and the board the chips go on (board.ts), each spot's chips one marker (marker.ts).
 */

buildBoard();
buildWheel();

startTable<Spot, RouletteRoundView>({
  name: 'roulette',
  title: 'Roulette',
  key: 'roulette',
  words: {
    button: 'Spin',
    verb: 'spin',
    doing: 'Spinning…',
    soon: 'spinning in',
    alone: 'Spin the wheel now',
    together: 'the wheel is spun once everyone has voted',
  },
  spots,
  renderSpot,

  clear() {
    for (const el of spots.values()) el.classList.remove('hit');
    showNumber(null);
  },

  show(round: RoundView) {
    turnTo(round.number, 0);
    showNumber(round.number);
    showRecent(round.recent);
  },

  async animate(round: RoundView, current: () => boolean) {
    showRecent(round.recent.slice(1));
    turnTo(round.number, SPIN_MS);
    await sleep(SPIN_MS + RESULT_MS);
    if (!current()) return;
    showNumber(round.number);
    showRecent(round.recent);
  },

  reveal(round: RoundView) {
    hit(round, true);
  },

  describe(round: RoundView) {
    const n = round.number;
    const words = [`${n} ${COLOR_NAME[round.color]}`];
    if (typeof n === 'number' && n > 0) words.push(n % 2 ? 'Odd' : 'Even', n <= 18 ? '1-18' : '19-36');
    return words.join(' · ');
  },
});

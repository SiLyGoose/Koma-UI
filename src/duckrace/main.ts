import { DUCKS, type Duck, type DuckRaceExtras, type DuckRaceRoundView, type RoundView } from '../protocol/duckrace';
import { startTable } from '../table/table';
import { buildCourse, resetCourse, runRace, showFinished, showRecent, showWinner } from './course';
import './duckrace.css';
import { play } from './sfx';
import { buildSpots, showOdds, spots } from './spots';

/*
 * The duck race in the browser, at a shared table (../table/table.ts does the table: the chips, the
 * players, the countdown and the bot). This is the felt: the course the four ducks race down
 * (course.ts), run when the round is dealt, and a spot for each duck the chips go on (spots.ts).
 */

buildCourse();
buildSpots();

const PLACES = ['2nd', '3rd', '4th'];

startTable<Duck, DuckRaceRoundView, DuckRaceExtras>({
  name: 'duck race',
  title: 'Duck Race',
  key: 'duckrace',
  words: {
    button: 'Race',
    verb: 'race',
    doing: 'Racing…',
    soon: 'racing in',
    alone: 'Start the race now',
    together: 'the ducks race once everyone has voted',
  },
  spots,

  clear() {
    resetCourse();
  },

  show(round: RoundView) {
    showFinished(round);
    showRecent(round.recent);
  },

  async animate(round: RoundView, current: () => boolean) {
    showRecent(round.recent.slice(1));
    play('start');
    await runRace(round, current);
    if (!current()) return;
    play('finish');
    showRecent(round.recent);
  },

  reveal(round: RoundView) {
    showWinner(round);
  },

  describe(round: RoundView) {
    const rest = round.order.slice(1).map((duck, i) => `${DUCKS[duck].name} ${PLACES[i]}`);
    return [`${DUCKS[round.winner].name} wins`, ...rest].join(' · ');
  },

  render(state) {
    showOdds(state.payout);
  },
});

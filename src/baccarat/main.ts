import { sleep } from '../shared/util';
import { startTable } from '../table/table';
import './baccarat.css';
import type { BaccaratExtras, BaccaratRoundView, Card, RoundView, Spot } from './protocol';
import { drawRoads } from './scoreboard';
import { play } from './sfx';

/*
 * Baccarat in the browser, at a shared table (../table/table.ts does the table: the chips, the
 * players, the countdown and the bot). This is the felt: the two hands, dealt out card by card when
 * the round is dealt, and the five spots the chips go on. Under it, the table's scoreboard
 * (scoreboard.ts).
 */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const ui = {
  verdict: $('verdict'),
  cards: { player: $('cards-player'), banker: $('cards-banker') },
  totals: { player: $('total-player'), banker: $('total-banker') },
  hands: { player: $('hand-player'), banker: $('hand-banker') },
};

const SPOT_NAME: Record<Spot, string> = { player: 'Player', banker: 'Banker', tie: 'Tie', kirin: 'Kirin', phoenix: 'Phoenix' };
const spots = new Map<Spot, HTMLElement>([...document.querySelectorAll<HTMLElement>('[data-spot]')].map((el) => [el.dataset.spot as Spot, el]));

/** How long between cards as a round is dealt out, and before the result shows. */
const CARD_MS = 850;
/** The pause before a third card, once both hands have two (a hand that stands has no third card). */
const THIRD_CARD_PAUSE_MS = 1600;
const RESULT_MS = 450;

const SUIT: Record<Card['suit'], string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const rankLabel = (rank: number): string => (rank === 1 ? 'A' : rank === 11 ? 'J' : rank === 12 ? 'Q' : rank === 13 ? 'K' : String(rank));
const cardPoints = (card: Card): number => (card.rank >= 10 ? 0 : card.rank);
const handTotal = (cards: Card[]): number => cards.reduce((sum, card) => sum + cardPoints(card), 0) % 10;

function cardEl(card: Card, third: boolean): HTMLElement {
  const el = document.createElement('div');
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  el.className = `bc-card${red ? ' red' : ''}${third ? ' third' : ''}`;
  const face = document.createElement('div');
  face.className = 'bc-card-face';
  const corner = document.createElement('span');
  corner.className = 'bc-card-corner';
  corner.textContent = `${rankLabel(card.rank)}${SUIT[card.suit]}`;
  const middle = document.createElement('span');
  middle.className = 'bc-card-suit';
  middle.textContent = SUIT[card.suit];
  const back = document.createElement('div');
  back.className = 'bc-card-back';
  face.append(corner, middle);
  el.append(face, back);
  el.setAttribute('aria-label', `${rankLabel(card.rank)} of ${card.suit}`);
  return el;
}

drawRoads();

startTable<Spot, BaccaratRoundView, BaccaratExtras>({
  name: 'baccarat',
  title: 'Baccarat',
  key: 'baccarat',
  words: {
    button: 'Deal',
    verb: 'deal',
    doing: 'Dealing…',
    soon: 'dealing in',
    alone: 'Deal the cards now',
    together: 'the cards are dealt once everyone has voted',
  },
  spots,

  clear() {
    for (const side of ['player', 'banker'] as const) {
      ui.cards[side].textContent = '';
      ui.totals[side].textContent = '';
      ui.hands[side].classList.remove('winner');
    }
    ui.verdict.textContent = '';
    ui.verdict.className = 'bc-vs';
  },

  show(round: RoundView) {
    for (const side of ['player', 'banker'] as const) {
      round[side].forEach((card, i) => {
        const el = cardEl(card, i === 2);
        el.classList.add('flip');
        ui.cards[side].append(el);
      });
      ui.totals[side].textContent = String(handTotal(round[side]));
    }
    drawRoads(round.history);
  },

  /** Deals the round out on the table, card by card. */
  async animate(round: RoundView, current: () => boolean) {
    // The scoreboard gets this hand once it's been dealt out (in reveal). (No history: a bot from before the scoreboard.)
    drawRoads((round.history ?? []).slice(0, -1));
    const dealt = { player: [] as Card[], banker: [] as Card[] };
    for (const [i, side] of round.order.entries()) {
      // Two cards each first; then a pause, so the third card (if the rules call for one) comes on its own.
      await sleep(i === 4 ? THIRD_CARD_PAUSE_MS : CARD_MS);
      if (!current()) return;
      const card = round[side][dealt[side].length] as Card;
      dealt[side].push(card);
      const el = cardEl(card, dealt[side].length === 3);
      ui.cards[side].append(el);
      requestAnimationFrame(() => el.classList.add('flip'));
      play('card');
      ui.totals[side].textContent = String(handTotal(dealt[side]));
    }
    await sleep(RESULT_MS);
  },

  reveal(round: RoundView) {
    drawRoads(round.history, true);
    const { winner } = round;
    if (winner !== 'tie') ui.hands[winner].classList.add('winner');
    ui.verdict.textContent = winner === 'tie' ? 'TIE' : `${SPOT_NAME[winner].toUpperCase()} WINS`;
    ui.verdict.className = `bc-vs show ${winner}`;
  },

  describe(round: RoundView) {
    const notes: string[] = [];
    if (round.natural) notes.push(`Natural ${Math.max(round.playerTotal, round.bankerTotal)}`);
    if (round.winner === 'player' && round.player.length === 3 && round.playerTotal === 8) notes.push('🦄 Kirin');
    if (round.winner === 'banker' && round.banker.length === 3 && round.bankerTotal === 7) notes.push('🐦‍🔥 Phoenix');
    return [`${round.playerTotal} to ${round.bankerTotal}`, ...notes].join(' · ');
  },

  /** What each spot pays. */
  render(state) {
    for (const [spot, el] of spots) {
      const odds = el.querySelector<HTMLElement>('[data-odds]');
      if (odds) odds.textContent = `${state.payouts[spot]}:1`;
    }
  },
});

import { points } from '../shared/util';
import { cardBack, cardEl, sameCard } from './cards';
import { mySeat, moveText, send, type PokerContext } from './context';
import type { Card, PokerState, SeatView } from './protocol';
import { play } from './sfx';

/*
 * The eight seats round the felt, turned so this page's player sits at the bottom (seat 0 does while
 * they aren't sitting), and what's in front of each: their cards, their bet, the dealer button. An
 * empty seat can be sat in (while not sitting); a bot can be taken away by anyone sitting.
 */

const SEATS = 8;
const root = document.getElementById('seats') as HTMLElement;

interface SeatEls {
  seat: HTMLElement;
  bet: HTMLElement;
  dealer: HTMLElement;
}

const els: SeatEls[] = Array.from({ length: SEATS }, () => {
  const seat = document.createElement('div');
  seat.className = 'pk-seat';
  const bet = document.createElement('div');
  bet.className = 'pk-bet';
  const dealer = document.createElement('div');
  dealer.className = 'pk-dealer';
  dealer.textContent = 'D';
  root.append(bet, dealer, seat);
  return { seat, bet, dealer };
});

/** Where a seat goes round the oval: `turned` places from the bottom, going clockwise. `toward` pulls it in toward the middle (0 to 1). */
function spot(turned: number, toward = 0): { x: number; y: number } {
  const angle = (turned / SEATS) * Math.PI * 2;
  const pull = 1 - toward;
  return { x: 50 - 46 * Math.sin(angle) * pull, y: 50 + 42 * Math.cos(angle) * pull };
}

const place = (el: HTMLElement, p: { x: number; y: number }): void => {
  el.style.left = `${p.x}%`;
  el.style.top = `${p.y}%`;
};

/** The best five cards a seat showed down with (to light them up). */
const bestOf = (state: PokerState, seat: number): Card[] => state.hand?.result?.shown[seat]?.best ?? [];

function seatContent(ctx: PokerContext, state: PokerState, s: SeatView, seated: boolean): HTMLElement[] {
  const parts: HTMLElement[] = [];
  const hand = state.hand;
  const result = hand?.result ?? null;

  // The cards: face up when the page may see them, face down while they hold some, none once folded.
  const cards = document.createElement('div');
  cards.className = 'pk-seat-cards';
  const best = bestOf(state, s.seat);
  const dealNow = hand !== null && ctx.dealtHand !== hand.no && !result;
  if (s.cards) {
    s.cards.forEach((card, i) => {
      const el = cardEl(card, dealNow);
      if (best.some((b) => sameCard(b, card))) el.classList.add('best');
      if (dealNow) el.style.animationDelay = `${i * 120}ms`;
      cards.append(el);
    });
  } else if (s.inHand && !s.folded) {
    cards.append(cardBack(), cardBack());
  }
  parts.push(cards);

  const box = document.createElement('div');
  box.className = 'pk-seat-box';
  const pic = s.bot ? Object.assign(document.createElement('div'), { className: 'pk-avatar bot', textContent: '🤖' }) : document.createElement('img');
  if (pic instanceof HTMLImageElement) {
    pic.className = 'pk-avatar';
    pic.src = s.avatar;
    pic.alt = '';
    pic.referrerPolicy = 'no-referrer';
    pic.draggable = false;
  }
  const text = document.createElement('div');
  text.className = 'pk-seat-text';
  const name = document.createElement('span');
  name.className = 'pk-seat-name';
  name.textContent = s.name;
  name.title = s.name;
  const chips = document.createElement('span');
  chips.className = 'pk-seat-chips';
  chips.textContent = s.allIn ? 'All in' : points(s.chips);
  text.append(name, chips);
  box.append(pic, text);

  // What they did last, how they did, or why they aren't playing.
  const tag = document.createElement('span');
  tag.className = 'pk-seat-tag';
  const won = result?.won[s.seat];
  if (won) {
    tag.textContent = `+${points(won)}`;
    tag.classList.add('won');
  } else if (result?.shown[s.seat]) {
    tag.textContent = result.shown[s.seat]?.hand ?? '';
  } else if (s.leaving) {
    tag.textContent = 'Leaving';
  } else if (s.away) {
    tag.textContent = 'Away';
  } else if (s.last) {
    tag.textContent = moveText(s.last, state.blinds.big);
    tag.classList.add(s.last.type);
  } else if (!s.inHand && hand && !result) {
    tag.textContent = 'Next hand';
  }
  if (tag.textContent) box.append(tag);

  const timer = document.createElement('div');
  timer.className = 'pk-seat-timer';
  timer.append(document.createElement('i'));
  box.append(timer);
  parts.push(box);

  if (s.bot && seated) {
    const kick = document.createElement('button');
    kick.type = 'button';
    kick.className = 'pk-seat-kick';
    kick.title = `Take ${s.name} away (after this hand)`;
    kick.setAttribute('aria-label', kick.title);
    kick.textContent = '×';
    kick.addEventListener('click', () => send(ctx, { t: 'bot', add: false, seat: s.seat }));
    parts.push(kick);
  }
  return parts;
}

/** Draws every seat. */
export function renderSeats(ctx: PokerContext): void {
  const state = ctx.state;
  if (!state) return;
  const me = mySeat(ctx);
  const base = me?.seat ?? 0;
  const hand = state.hand;
  const result = hand?.result ?? null;
  let chipsIn = false;

  state.seats.forEach((s, i) => {
    const { seat, bet, dealer } = els[i] as SeatEls;
    const turned = (i - base + SEATS) % SEATS;
    place(seat, spot(turned));
    place(bet, spot(turned, 0.42));
    place(dealer, spot(turned + 0.42, 0.3));
    seat.dataset.turned = String(turned);

    dealer.hidden = !hand || hand.button !== i;
    seat.className = 'pk-seat';
    seat.replaceChildren();
    if (!s) {
      seat.classList.add('empty');
      const empty = document.createElement('button');
      empty.type = 'button';
      empty.className = 'pk-seat-open';
      empty.disabled = me !== null;
      empty.textContent = me ? 'Empty' : 'Sit here';
      empty.addEventListener('click', () => {
        if (!mySeat(ctx)) send(ctx, { t: 'sit', chips: ctx.sitChips, seat: i });
      });
      seat.append(empty);
      bet.hidden = true;
      ctx.bets.delete(i);
      return;
    }
    if (s.id === state.you) seat.classList.add('you');
    if (hand && !result && hand.toAct === i) seat.classList.add('turn');
    if (s.folded || (!s.inHand && hand && !result)) seat.classList.add('out');
    if (result?.won[i]) seat.classList.add('winner');
    if (s.away) seat.classList.add('away');
    seat.append(...seatContent(ctx, state, s, me !== null));

    bet.hidden = s.bet <= 0;
    bet.textContent = points(s.bet);
    if (s.bet > (ctx.bets.get(i) ?? 0)) chipsIn = true;
    ctx.bets.set(i, s.bet);
  });

  if (hand && ctx.dealtHand !== hand.no) {
    ctx.dealtHand = hand.no;
    if (!result) play('card');
  }
  if (chipsIn) play('chips');
}

/** Moves the acting seat's timer bar on (every few frames). */
export function renderSeatTimer(ctx: PokerContext): void {
  const state = ctx.state;
  const acting = state?.hand && !state.hand.result ? state.hand.toAct : null;
  const left = Math.max(0, ctx.deadline - performance.now());
  els.forEach(({ seat }, i) => {
    const bar = seat.querySelector<HTMLElement>('.pk-seat-timer i');
    if (!bar) return;
    const on = acting === i && ctx.deadline > 0 && state?.phase === 'playing';
    seat.classList.toggle('timed', on);
    bar.style.width = on ? `${Math.min(100, (left / ctx.whole) * 100)}%` : '0%';
    bar.classList.toggle('low', on && left < 8_000);
  });
}

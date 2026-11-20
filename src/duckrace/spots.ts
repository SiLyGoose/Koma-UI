import { DUCK_IDS, DUCKS, type Duck } from '../protocol/duckrace';
import { duckSvg } from './duck';

/*
 * The ducks to bet on: a big spot for each, its colour, name and what it pays, with everyone's chips
 * on it drawn as the table draws a big spot's (../table/chips/piles.ts: .tb-others, .tb-piles, .tb-stack).
 */

const box = document.getElementById('spots') as HTMLElement;

export const spots = new Map<Duck, HTMLElement>();
const odds: HTMLElement[] = [];

export function buildSpots(): void {
  for (const duck of DUCK_IDS) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'dr-spot';
    el.dataset.spot = duck;
    el.style.setProperty('--duck', DUCKS[duck].color);
    el.setAttribute('aria-label', `Bet on ${DUCKS[duck].name}`);
    const head = document.createElement('span');
    head.className = 'dr-spot-head';
    const name = document.createElement('span');
    name.className = 'dr-spot-name';
    name.textContent = DUCKS[duck].name;
    const pays = document.createElement('span');
    pays.className = 'dr-spot-odds';
    odds.push(pays);
    head.append(duckSvg(duck, 'dr-spot-svg'), name, pays);
    for (const part of ['tb-others', 'tb-piles', 'tb-stack']) {
      const span = document.createElement('span');
      span.className = part;
      el.append(span);
    }
    el.prepend(head);
    box.append(el);
    spots.set(duck, el);
  }
}

/** What a winning duck pays, on every spot. */
export function showOdds(payout: number): void {
  for (const el of odds) el.textContent = `${payout} to 1`;
}

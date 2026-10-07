import type { Card } from './protocol';

/*
 * The cards on the table: face up (the board, this player's own, and anyone's at the showdown) or
 * face down (another player's, while they hold them).
 */

const SUIT: Record<Card['suit'], string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
export const rankLabel = (rank: number): string => (rank === 1 ? 'A' : rank === 11 ? 'J' : rank === 12 ? 'Q' : rank === 13 ? 'K' : String(rank));
export const sameCard = (a: Card, b: Card): boolean => a.rank === b.rank && a.suit === b.suit;

/** A card face up. `flip` deals it in with a turn (a card that has just come). */
export function cardEl(card: Card, flip = false): HTMLElement {
  const el = document.createElement('div');
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  el.className = `pk-card${red ? ' red' : ''}${flip ? ' flip' : ''}`;
  el.setAttribute('aria-label', `${rankLabel(card.rank)} of ${card.suit}`);
  const corner = document.createElement('span');
  corner.className = 'pk-card-corner';
  corner.textContent = rankLabel(card.rank);
  const suit = document.createElement('span');
  suit.className = 'pk-card-suit';
  suit.textContent = SUIT[card.suit];
  el.append(corner, suit);
  return el;
}

/** A card face down. */
export function cardBack(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'pk-card back';
  el.setAttribute('aria-label', 'A card face down');
  return el;
}

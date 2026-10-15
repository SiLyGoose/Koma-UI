import type { Vector3 } from 'three';
import type { NumberKind } from '../sim/shown';
import { el } from './dom';

/*
 * How each kind of number (../sim/shown.ts) looks: a blow yellow, a critical blow red ("Critical Hit" over it), a blow
 * lessened by a block light blue, what a shield took gray, health given back green, and a blow dodged (or one it is immune to) white (it says so,
 * with no number).
 */

/** A number to come off whoever a blow landed on (or a heal reached), where it was on the field. */
export interface Popup {
  amount: number;
  kind: NumberKind;
  at: Vector3;
}

/** The numbers coming off whoever is hit or healed: each rises and fades by itself (../styles/numbers.css). */
export interface Numbers {
  /** A number at this spot on the field's picture (CSS pixels from its top left). */
  show(x: number, y: number, amount: number, kind: NumberKind): void;
}

/** How far either way a number may start from its spot, so blows close together don't cover each other. */
const SPREAD = 22;

/** The numbers, put in `parent`. */
export function makeNumbers(parent: HTMLElement): Numbers {
  return {
    show(x, y, amount, kind) {
      const shown = Math.max(1, Math.round(amount));
      const number = el('div', `tm-number ${kind}`, kind === 'dodged' ? 'Dodge' : kind === 'immune' ? 'Immune' : kind === 'heal' ? `+${shown}` : `${shown}`);
      // A critical blow says so, over its number.
      if (kind === 'crit') number.prepend(el('span', 'tm-number-label', 'Critical Hit'));
      number.style.left = `${x + (Math.random() * 2 - 1) * SPREAD}px`;
      number.style.top = `${y + (Math.random() * 2 - 1) * SPREAD * 0.5}px`;
      number.addEventListener('animationend', () => number.remove(), { once: true });
      parent.append(number);
    },
  };
}

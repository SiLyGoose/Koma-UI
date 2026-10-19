import type { Vector3 } from 'three';
import type { NumberKind } from '../sim/shown';
import { el } from './dom';

/*
 * How each kind of number (../sim/shown.ts) looks, in King's Raid's colours (its GameSetting's DamageFloatDataNew): a blow
 * white, a skill's blow orange, a critical blow gold ("Critical Hit" over it), a blow lessened by a block light blue (a
 * shield and "Block" over it), what a shield took gray, health given back green, and a blow dodged ("Miss") or one it is
 * immune to ("Physical Immune", "Magic Immune") white, with no number. The words are King's Raid's own (its Battle.Damage2
 * atlas, in public/kr/damage/: white with a dark edge, coloured as the number is).
 */

/** A number to come off whoever a blow landed on (or a heal reached), where it was on the field; for one it is immune to, whether the blow was magical. */
export interface Popup {
  amount: number;
  kind: NumberKind;
  at: Vector3;
  magical?: boolean;
}

/** The numbers coming off whoever is hit or healed: each rises and fades by itself (../styles/numbers.css). */
export interface Numbers {
  /** A number at this spot on the field's picture (CSS pixels from its top left). */
  show(x: number, y: number, amount: number, kind: NumberKind, magical?: boolean): void;
}

/** How far either way a number may start from its spot, so blows close together don't cover each other. */
const SPREAD = 22;

/** King's Raid's words: each picture's name in public/kr/damage/, and its size (px). */
const WORDS = {
  critical: ['Text_Critical', 362, 82],
  miss: ['Text_Miss', 160, 82],
  block: ['Text_Block', 194, 82],
  physical: ['Text_Immune_Physical', 582, 82],
  magical: ['Text_Immune_Magical', 524, 82],
} as const;

/** One of King's Raid's words, coloured as its number (the CSS lays the gradient over the picture, and cuts it to its shape). */
function word([name, width, height]: (typeof WORDS)[keyof typeof WORDS], className: string, label: string): HTMLElement {
  const made = el('span', `tm-number-word ${className}`);
  made.style.setProperty('--word', `url('/kr/damage/${name}.webp')`);
  made.style.aspectRatio = `${width} / ${height}`;
  made.setAttribute('aria-label', label);
  return made;
}

/** Text with its colour laid over its outline (the CSS draws `data-text` again on top, in the kind's gradient). */
function layered(className: string, text: string): HTMLSpanElement {
  const span = el('span', className, text);
  span.dataset.text = text;
  return span;
}

/** The numbers, put in `parent`. */
export function makeNumbers(parent: HTMLElement): Numbers {
  return {
    show(x, y, amount, kind, magical = false) {
      const shown = Math.max(1, Math.round(amount));
      const number = el('div', `tm-number ${kind}`);
      if (kind === 'dodged') number.append(word(WORDS.miss, 'tm-number-only', 'Miss'));
      else if (kind === 'immune') number.append(word(magical ? WORDS.magical : WORDS.physical, 'tm-number-only', magical ? 'Magic Immune' : 'Physical Immune'));
      else {
        // A critical blow says so over its number; a blocked one, with King's Raid's shield beside it.
        if (kind === 'crit') number.append(word(WORDS.critical, 'tm-number-label', 'Critical Hit'));
        if (kind === 'blocked') {
          const label = el('span', 'tm-number-label tm-number-block');
          const shield = el('img', '');
          shield.src = '/kr/damage/Icon_Block.webp';
          shield.alt = '';
          label.append(shield, word(WORDS.block, '', 'Block'));
          number.append(label);
        }
        number.append(layered('tm-number-value', kind === 'heal' ? `+${shown}` : `${shown}`));
      }
      number.style.left = `${x + (Math.random() * 2 - 1) * SPREAD}px`;
      number.style.top = `${y + (Math.random() * 2 - 1) * SPREAD * 0.5}px`;
      number.addEventListener('animationend', () => number.remove(), { once: true });
      parent.append(number);
    },
  };
}

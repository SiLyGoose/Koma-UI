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
  /** Whom it comes off (a hero, the boss, one of its minions, or the boss's own healing): the same for each number on one body. */
  on: string;
}

/** The numbers coming off whoever is hit or healed: each rises and fades by itself (../styles/numbers.css). */
export interface Numbers {
  /** A number at this spot on the field's picture (CSS pixels from its top left). */
  show(x: number, y: number, popup: Popup): void;
  /** None on the field (a new fight). */
  clear(): void;
}

/** How far either way a number may start from its spot, so blows close together don't cover each other. */
const SPREAD = 22;

/** The most numbers on the field at once (with 7–9 heroes on the boss, more only cover each other and slow the page). */
const MOST = 40;

/** Numbers of one kind on one body: added together (a frame's own, as one number). */
const same = (a: Popup, b: Popup): boolean => a.on === b.on && a.kind === b.kind && !a.magical === !b.magical;

/** A frame's numbers, those of a kind on one body as one: their amounts added, where the first was. */
export function together(popups: Popup[]): Popup[] {
  const kept: Popup[] = [];
  for (const popup of popups) {
    const of = kept.find((other) => same(other, popup));
    if (of) of.amount += popup.amount;
    else kept.push(popup);
  }
  return kept;
}

/** What a number says (at least 1; a heal's with a plus). */
const said = (amount: number, kind: NumberKind): string => {
  const shown = Math.max(1, Math.round(amount));
  return kind === 'heal' ? `+${shown}` : `${shown}`;
};

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

/** A number on the field: what it came from, and its value's text (none for a word alone). */
interface Shown {
  popup: Popup;
  element: HTMLElement;
  value: HTMLSpanElement | null;
}

/** The numbers, put in `parent`. */
export function makeNumbers(parent: HTMLElement): Numbers {
  /** Those on the field, oldest first. */
  const live: Shown[] = [];
  return {
    show(x, y, popup) {
      const { kind, magical = false } = popup;
      if (live.length >= MOST) {
        // Full: added to the newest of its kind still coming off that body, or else the oldest goes.
        let of: Shown | undefined;
        for (let i = live.length - 1; i >= 0 && !of; i--) if (same(live[i]!.popup, popup)) of = live[i];
        if (of) {
          of.popup.amount += popup.amount;
          if (of.value) of.value.textContent = of.value.dataset.text = said(of.popup.amount, kind);
          return;
        }
        live.shift()?.element.remove();
      }
      const number = el('div', `tm-number ${kind}`);
      let value: HTMLSpanElement | null = null;
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
        value = layered('tm-number-value', said(popup.amount, kind));
        number.append(value);
      }
      number.style.left = `${x + (Math.random() * 2 - 1) * SPREAD}px`;
      number.style.top = `${y + (Math.random() * 2 - 1) * SPREAD * 0.5}px`;
      const shown: Shown = { popup, element: number, value };
      number.addEventListener(
        'animationend',
        () => {
          number.remove();
          live.splice(live.indexOf(shown), 1);
        },
        { once: true },
      );
      live.push(shown);
      parent.append(number);
    },
    clear() {
      live.length = 0;
      parent.replaceChildren();
    },
  };
}

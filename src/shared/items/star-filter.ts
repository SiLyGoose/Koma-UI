import { el, stars } from './items';

/*
 * The star filter the armories share (the gear page's, the forge's, the databank's): a row of chips, Any
 * then 4 to 1 stars, one pressed at a time, each in its tier's colour (items.css). Its markup is a box
 * in the page (`<div class="star-chips" aria-label="Stars">`); the chips go in at its start, so a page
 * can keep chips of its own after them (the databank's Owned only).
 */

export type StarChoice = 1 | 2 | 3 | 4 | 'all';

const TIERS = [4, 3, 2, 1] as const;

/** Whether an item of `n` stars is shown under `choice`. */
export const matchesStars = (choice: StarChoice, n: number): boolean => choice === 'all' || n === choice;

export interface StarFilter {
  /** The choice pressed now. */
  value(): StarChoice;
  /** Presses `choice` (without telling onChange). */
  set(choice: StarChoice): void;
}

/** Fills `box` with the star chips, Any pressed; `onChange` hears each choice pressed. */
export function starFilter(box: HTMLElement, onChange: (choice: StarChoice) => void): StarFilter {
  let current: StarChoice = 'all';
  const chips = new Map<StarChoice, HTMLButtonElement>();

  const chip = (choice: StarChoice): HTMLButtonElement => {
    const button = el('button', 'star-chip');
    button.type = 'button';
    if (choice === 'all') {
      button.setAttribute('aria-label', 'Any stars');
      button.append('Any ', stars(1));
    } else {
      button.dataset.stars = String(choice);
      button.setAttribute('aria-label', `${choice} star${choice === 1 ? '' : 's'}`);
      button.append(stars(choice));
    }
    button.addEventListener('click', () => {
      if (choice === current) return;
      set(choice);
      onChange(choice);
    });
    chips.set(choice, button);
    return button;
  };

  const set = (choice: StarChoice): void => {
    current = choice;
    for (const [value, button] of chips) button.setAttribute('aria-pressed', String(value === choice));
  };

  box.prepend(chip('all'), ...TIERS.map(chip));
  set('all');
  return { value: () => current, set };
}

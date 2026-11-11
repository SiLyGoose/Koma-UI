import type { BossAttack } from '../sim/bosses/boss';
import { attr, el } from './dom';

/*
 * The boss's attacks under the field, for trying things out: a button for each attack the boss has, and
 * Boss auto, which has it attack by itself. (In a raid the boss attacks by itself, and they are hidden.)
 */

export interface Actions {
  /** Shows Boss auto on or off (and the attacks of the boss on the field, should it have changed). */
  draw(auto: boolean): void;
  /** Takes the buttons away (a raid). */
  remove(): void;
}

/**
 * Puts a button for each attack of the boss on the field (`attacks`) in `row`, before `auto`: pressed, `use` is told its
 * name; `auto` pressed, `toggle`. (A fight against two, Tersio then Apocalypsion: the second's in their place as it comes in.)
 */
export function makeActions(row: HTMLElement, auto: HTMLButtonElement, attacks: () => readonly BossAttack[], { use, toggle }: { use: (attack: string) => void; toggle: () => void }): Actions {
  let buttons: HTMLButtonElement[] = [];
  /** The attacks the buttons are for. */
  let shown: readonly BossAttack[] | null = null;
  const list = (): void => {
    const now = attacks();
    if (now === shown) return;
    shown = now;
    for (const button of buttons) button.remove();
    buttons = now.map((attack) => {
      const button = el('button', 'action secondary', attack.label);
      button.type = 'button';
      button.addEventListener('click', () => use(attack.name));
      row.insertBefore(button, auto);
      return button;
    });
  };
  list();
  auto.disabled = false;
  auto.hidden = false;
  auto.onclick = toggle;
  return {
    draw(on) {
      list();
      attr(auto, 'aria-pressed', String(on));
    },
    remove() {
      for (const button of buttons) button.remove();
      auto.hidden = true;
      auto.onclick = null;
    },
  };
}

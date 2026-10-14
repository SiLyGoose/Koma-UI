import type { BossAttack } from '../bosses/boss';
import { el } from './dom';

/*
 * The boss's attacks under the field, for trying things out: a button for each attack the boss has, and
 * Boss auto, which has it attack by itself. (In a raid the boss attacks by itself, and they are hidden.)
 */

export interface Actions {
  /** Shows Boss auto on or off. */
  draw(auto: boolean): void;
  /** Takes the buttons away (a raid). */
  remove(): void;
}

/** Puts a button for each attack in `row`, before `auto`: pressed, `use` is told its name; `auto` pressed, `toggle`. */
export function makeActions(row: HTMLElement, auto: HTMLButtonElement, attacks: readonly BossAttack[], { use, toggle }: { use: (attack: string) => void; toggle: () => void }): Actions {
  const buttons = attacks.map((attack) => {
    const button = el('button', 'action secondary', attack.label);
    button.type = 'button';
    button.addEventListener('click', () => use(attack.name));
    row.insertBefore(button, auto);
    return button;
  });
  auto.disabled = false;
  auto.hidden = false;
  auto.onclick = toggle;
  return {
    draw(on) {
      auto.setAttribute('aria-pressed', String(on));
    },
    remove() {
      for (const button of buttons) button.remove();
      auto.hidden = true;
      auto.onclick = null;
    },
  };
}

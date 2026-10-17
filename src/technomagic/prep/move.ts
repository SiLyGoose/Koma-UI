import '../../shared/ui/level/level.css';
import { el } from '../hud/dom';

/*
 * Another dragon, pressed on the prep screen of a raid with others in it: a popup in the middle (the Leave popup's box,
 * ../hud/leave.ts) asking how to go. The host brings everyone along (the raid goes against it, as it is), or goes alone
 * (leaving the raid to the others, and creating one of their own against it); anyone else can only go alone. Two raids
 * are never put together. Stay, its ✕, the dark around it or Escape keep them where they are.
 */

export interface MovePopup {
  /** Asks about going against `boss` (its name): as the host, with `others` (their names) in the raid; or as one of them. */
  open(boss: string, others: readonly string[], host: boolean): void;
  close(): void;
}

/** The popup, put in `into`: `bring` takes everyone along, `alone` leaves the raid for one of their own. */
export function movePopup(into: HTMLElement, choose: { bring: () => void; alone: () => void }): MovePopup {
  const root = el('div', 'level-pop tm-leave-pop');
  root.hidden = true;
  root.setAttribute('role', 'alertdialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'tm-move-title');
  root.setAttribute('aria-describedby', 'tm-move-text');
  const box = el('div', 'level-box');
  const head = el('div', 'level-head');
  head.id = 'tm-move-title';
  const icon = el('div', 'tm-leave-icon tm-move-icon', '🐉');
  icon.setAttribute('aria-hidden', 'true');
  const text = el('p', 'tm-leave-text');
  text.id = 'tm-move-text';
  const actions = el('div', 'level-actions');
  const stay = el('button', 'tm-leave-stay', 'Stay');
  stay.type = 'button';
  const alone = el('button', 'tm-leave-stay tm-move-alone', 'Go Alone');
  alone.type = 'button';
  const bring = el('button', 'tm-move-bring', 'Bring Them');
  bring.type = 'button';
  actions.append(stay, alone, bring);
  const closer = el('button', 'level-close', '✕');
  closer.type = 'button';
  closer.setAttribute('aria-label', 'Stay in this raid');
  box.append(head, icon, text, actions, closer);
  root.append(box);
  into.append(root);

  const close = (): void => {
    root.hidden = true;
  };
  stay.addEventListener('click', close);
  closer.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !root.hidden) close();
  });
  bring.addEventListener('click', () => {
    close();
    choose.bring();
  });
  alone.addEventListener('click', () => {
    close();
    choose.alone();
  });

  /** "A", "A and B", "A, B and C". */
  const listed = (names: readonly string[]): string => (names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

  return {
    open(boss, others, host) {
      if (host) {
        head.textContent = 'Bring Them Along?';
        text.textContent = `${listed(others)} ${others.length === 1 ? 'is' : 'are'} in your raid. Take everyone to ${boss} with you, or go alone and leave this raid to them?`;
      } else {
        head.textContent = 'Leave This Raid?';
        text.textContent = `Only the host can take the raid to another dragon. Leave it and create a raid of your own against ${boss}?`;
      }
      bring.hidden = !host;
      stay.hidden = host;
      root.hidden = false;
      (host ? bring : stay).focus();
    },
    close,
  };
}

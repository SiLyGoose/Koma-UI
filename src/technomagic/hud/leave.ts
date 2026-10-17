import '../../shared/ui/level/level.css';
import { el } from './dom';

/*
 * Leave, mid-fight in a room: a popup in the middle, as the raid's others are (the Raid Settings' box), asking
 * first. Single player, leaving loses the battle; with others, the leaver's heroes fight on with the party, on
 * Auto, and only the leaver forfeits what it gives. Stay, its ✕, the dark around it or Escape keep them in it.
 */

export interface LeavePopup {
  /** Asks, as it is for one alone (`single`) or with others. */
  open(single: boolean): void;
  close(): void;
}

/**
 * The popup, put in `into`. Leave calls `leave`, which says why it couldn't (shown in the popup), or null once they
 * have left (their Defeat shown, or the page on its way out).
 */
export function leavePopup(into: HTMLElement, leave: () => string | null): LeavePopup {
  const root = el('div', 'level-pop tm-leave-pop');
  root.hidden = true;
  root.setAttribute('role', 'alertdialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'tm-leave-title');
  root.setAttribute('aria-describedby', 'tm-leave-text');
  const box = el('div', 'level-box');
  const head = el('div', 'level-head', 'Leave Battle?');
  head.id = 'tm-leave-title';
  const icon = el('div', 'tm-leave-icon', '🚪');
  icon.setAttribute('aria-hidden', 'true');
  const text = el('p', 'tm-leave-text');
  text.id = 'tm-leave-text';
  const warn = el('p', 'tm-leave-warn');
  const note = el('p', 'level-note tm-leave-note');
  note.setAttribute('role', 'status');
  const actions = el('div', 'level-actions');
  const stay = el('button', 'tm-leave-stay', 'Stay');
  stay.type = 'button';
  const go = el('button', 'tm-leave-go', 'Leave');
  go.type = 'button';
  actions.append(stay, go);
  const closer = el('button', 'level-close', '✕');
  closer.type = 'button';
  closer.setAttribute('aria-label', 'Stay in the battle');
  box.append(head, icon, text, warn, note, actions, closer);
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
  go.addEventListener('click', () => {
    const why = leave();
    note.textContent = why ?? '';
    if (why === null) go.disabled = true;
  });

  return {
    open(single) {
      if (single) {
        text.textContent = 'Leaving now ends the battle, and it counts as lost.';
        warn.textContent = 'You forfeit this battle’s rewards.';
      } else {
        text.textContent = 'Your heroes stay in the fight on Auto, so the party fights on without you.';
        warn.textContent = 'You forfeit your rewards from this battle. Everyone else keeps theirs.';
      }
      note.textContent = '';
      go.disabled = false;
      root.hidden = false;
      stay.focus();
    },
    close,
  };
}

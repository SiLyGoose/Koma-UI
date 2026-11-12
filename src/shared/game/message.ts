/*
 * The box over a game that says why it can't go on, with the way home: put in the first time there's
 * something to say. Its styles are with the overlays' in ../style.css (.message, .message-card). The way home from a game
 * opened from v2 is v2's casino.
 */

import { V2_BACK, V2_GAME } from '../ui/frame/v2-game';

let box: { root: HTMLElement; title: HTMLElement; text: HTMLElement } | null = null;

function messageBox(): NonNullable<typeof box> {
  if (box) return box;
  const root = document.createElement('div');
  root.className = 'message';
  root.hidden = true;
  root.innerHTML = `
    <div class="message-card">
      <div class="message-title"></div>
      <div class="message-text"></div>
      <a class="message-link" href="${V2_GAME ? V2_BACK : '/'}">Go to the games</a>
    </div>`;
  document.body.append(root);
  box = {
    root,
    title: root.querySelector('.message-title') as HTMLElement,
    text: root.querySelector('.message-text') as HTMLElement,
  };
  return box;
}

export function showMessage(title: string, text: string): void {
  const { root, title: titleEl, text: textEl } = messageBox();
  titleEl.textContent = title;
  textEl.textContent = text;
  root.hidden = false;
}

export function hideMessage(): void {
  if (box) box.root.hidden = true;
}

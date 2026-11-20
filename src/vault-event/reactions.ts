import { REACTIONS, REACTION_GAP_MS } from '../protocol/reactions';
import { play } from './sfx';

/*
 * The reactions (../protocol/reactions.ts): a row of emoji under the stage that anyone can press (players, those
 * already out, and watchers too), and each one anyone presses floating up over the stage on every page in the server,
 * with the name of whoever pressed it. The bot sends them on at most one a person every REACTION_GAP_MS, so the
 * row rests that long after a press.
 */

export interface Reactions {
  /** Someone's reaction, to float up. */
  show(emoji: number, name: string, spectator: boolean): void;
}

/** Floating reactions at once, at most: more are dropped (a flood would only hide the game). */
const MOST_AT_ONCE = 24;

export function reactions(bar: HTMLElement, layer: HTMLElement, send: (emoji: number) => boolean): Reactions {
  const buttons = REACTIONS.map((emoji, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 've-react';
    button.textContent = emoji;
    button.setAttribute('aria-label', `React ${emoji}`);
    button.addEventListener('click', () => {
      if (bar.classList.contains('resting')) return;
      if (!send(i)) return;
      bar.classList.add('resting');
      window.setTimeout(() => bar.classList.remove('resting'), REACTION_GAP_MS);
    });
    return button;
  });
  bar.replaceChildren(...buttons);
  bar.hidden = false;

  function show(emoji: number, name: string, spectator: boolean): void {
    const art = REACTIONS[emoji];
    if (!art || layer.childElementCount >= MOST_AT_ONCE) return;
    const float = document.createElement('span');
    float.className = 've-float';
    float.style.setProperty('--left', `${8 + Math.random() * 84}%`);
    float.style.setProperty('--drift', `${Math.round((Math.random() - 0.5) * 60)}px`);
    const face = document.createElement('span');
    face.className = 've-float-emoji';
    face.textContent = art;
    const who = document.createElement('span');
    who.className = 've-float-name';
    who.textContent = spectator ? `👁 ${name}` : name;
    float.append(face, who);
    float.setAttribute('aria-hidden', 'true');
    float.addEventListener('animationend', () => float.remove());
    window.setTimeout(() => float.remove(), 3_000);
    layer.append(float);
    play('pop');
  }

  return { show };
}

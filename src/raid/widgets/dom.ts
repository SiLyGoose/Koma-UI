import type { RaidView } from '../protocol';

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** An HP bar, coloured by how much is left. */
export function hpBar(hp: number, max: number, className = ''): HTMLElement {
  const bar = el('div', `rd-bar ${className}`);
  const fill = el('span');
  const share = max > 0 ? Math.max(0, hp) / max : 0;
  fill.style.width = `${share * 100}%`;
  fill.className = share > 0.5 ? 'hi' : share > 0.25 ? 'mid' : 'lo';
  bar.append(fill);
  return bar;
}

/** A player's profile picture, or the first letter of their name when the bot doesn't know it. */
export function avatar(userId: string, v: RaidView): HTMLElement {
  const url = v.avatars[userId];
  const letter = (): HTMLElement => el('span', 'rd-initial', (v.names[userId] ?? '?').trim().charAt(0).toUpperCase() || '?');
  if (!url) return letter();
  const img = el('img');
  img.src = url;
  img.alt = '';
  img.draggable = false;
  img.referrerPolicy = 'no-referrer';
  img.addEventListener('error', () => img.replaceWith(letter()), { once: true });
  return img;
}

import './stars.css';
import { TRANSCEND_MAX } from '../../../protocol/heroes';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] => {
  const made = document.createElement(tag);
  if (className) made.className = className;
  if (text) made.textContent = text;
  return made;
};

/**
 * A hero's stars as King's Raid has them, five (every hero of theirs has them all; its star, Loading_Hero_Star), and how
 * far it is transcended (T1 to T5): on a card (the heroes page's roster, the raid's lineup and Heroes List), on a bigger
 * middle star (nothing there at T0); beside the heroes page's banner, as +3 after them.
 */
export function heroStars(level: number, where: 'card' | 'banner'): HTMLElement {
  const row = el('span', 'hero-rank');
  row.dataset.on = where;
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', level > 0 ? `5 stars, Transcend ${level} of ${TRANSCEND_MAX}` : '5 stars');
  row.title = level > 0 ? `Transcend ${level}` : 'Not transcended';
  for (let i = 0; i < 5; i++) {
    const middle = where === 'card' && level > 0 && i === 2;
    const star = el('span', middle ? 'hero-rank-star big' : 'hero-rank-star');
    const img = el('img');
    img.src = `${import.meta.env.BASE_URL}kr/ui/hero-star.webp`;
    img.alt = '';
    img.draggable = false;
    star.append(img);
    if (middle) star.append(el('span', 'hero-rank-level', String(level)));
    row.append(star);
  }
  if (where === 'banner' && level > 0) row.append(el('span', 'hero-rank-plus', `+${level}`));
  return row;
}

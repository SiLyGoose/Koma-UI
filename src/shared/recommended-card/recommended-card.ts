import './recommended-card.css';
import { OTHER_HEROES } from '../../databank/recommended';
import { HEROES } from '../../technomagic/sim/heroes';
import { className, FACE, heroCut } from '../heroes';
import { el } from '../items';

/**
 * A hero recommended against a raid's boss (or with another hero), as King's Raid's own Raid Info has them (its small hero
 * portrait, HeroPortraitSmall): its icon in the gold square frame, its class's tag and the kind of damage it deals over its top
 * left, a thumbs-up over its top right for one King's Raid picked, and its name under it; `why` it was picked, when it has one,
 * on hovering it. One the raid has is a button when there is somewhere to `open` it (the databank's heroes); one it doesn't
 * (../../databank/recommended.ts OTHER_HEROES) looks the same, its icon King's Raid's. In the databank, the hero shop and a
 * raid's Raid Info.
 */
export function recommendedCard(id: string, kr: boolean, why?: string, open?: (id: string) => void): HTMLElement[] {
  const ours = HEROES.find((one) => one.id === id);
  const other = OTHER_HEROES[id];
  const hero = ours ? { name: ours.name, class: ours.class, deals: ours.stats.deals } : other;
  if (!hero) return [];
  const card = ours && open ? el('button', 'rec-card') : el('div', 'rec-card');
  if (card instanceof HTMLButtonElement) card.type = 'button';
  card.title = `${hero.name}${kr ? ': King’s Raid’s own pick' : why ? `: ${why}` : ''}`;
  const square = el('span', 'rec-square');
  const face = el('span', 'rec-face', hero.name.slice(0, 1));
  const picture = ours ? heroCut(id, FACE, 120) : Promise.resolve(`/kr/hero-icons/${id}.webp`);
  void picture.then((src) => {
    if (!src) return;
    const img = el('img');
    img.src = src;
    img.alt = '';
    img.draggable = false;
    face.replaceChildren(img);
  });
  const mark = (name: string, src: string, alt: string): HTMLImageElement => {
    const img = el('img', name);
    img.src = src;
    img.alt = alt;
    img.draggable = false;
    return img;
  };
  square.append(
    face,
    el('span', 'rec-frame'),
    mark('rec-class', `/kr/ui/class-${hero.class}.webp`, className(hero.class)),
    mark('rec-deals', `/kr/ui/deals-${hero.deals}.webp`, hero.deals === 'magical' ? 'Magic' : 'Physical'),
  );
  if (kr) square.append(mark('rec-kr', '/kr/ui/thumbs-up.webp', 'King’s Raid’s pick'));
  card.append(square, el('span', 'rec-name', hero.name));
  if (card instanceof HTMLButtonElement && open) card.addEventListener('click', () => open(id));
  return [card];
}

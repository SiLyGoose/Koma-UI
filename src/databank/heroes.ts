import { el, statBlocks } from '../shared/items';
import { BUST, classBadge, className, FACE, heroCut } from '../shared/heroes';
import { skillRows } from '../heroes/render';
import { heroStats } from '../heroes/stats';
import { HEROES } from '../technomagic/sim/heroes';
import type { HeroDef } from '../technomagic/sim/heroes/kit';
import { label } from './bosses';
import { heroById, type DatabankContext } from './context';

/*
 * The TechnoMagic Raid's heroes: a card for each down the side (its face and name), and the one picked
 * beside them on parchment, in the bosses' frames: its picture, name and class, its stats in the raid as its
 * class has them (before any gear: the heroes page, ../heroes/, has them with it), and its skills in King's
 * Raid's own words. The raid itself knows them (../technomagic/heroes/), so this needs nothing from the bot.
 */

/** A face or bust of a hero, put in `img` once it's cut (its initial in `box` until then, or for good where its picture isn't served). */
function picture(hero: HeroDef, frame: typeof FACE, width: number, className: string): HTMLElement {
  const box = el('span', className, hero.name.slice(0, 1));
  void heroCut(hero.id, frame, width).then((src) => {
    if (!src) return;
    const img = el('img');
    img.src = src;
    img.alt = '';
    img.draggable = false;
    box.replaceChildren(img);
  });
  return box;
}

export function renderHeroes(ctx: DatabankContext): void {
  renderHeroList(ctx);
  renderHero(ctx);
}

/** A card for each hero; picking one shows it. */
function renderHeroList(ctx: DatabankContext): void {
  const { ui } = ctx;
  // Drawn again only for another pick, so its pictures don't flicker.
  if (ui.heroList.dataset.picked !== ctx.hero) {
    ui.heroList.dataset.picked = ctx.hero ?? '';
    ui.heroList.replaceChildren(
      ...HEROES.map((hero) => {
        const card = el('button', 'db-class-card db-hero-card');
        card.type = 'button';
        card.classList.toggle('picked', hero.id === ctx.hero);
        card.setAttribute('aria-pressed', String(hero.id === ctx.hero));
        card.append(picture(hero, FACE, 120, 'db-hero-card-face'), el('span', 'db-class-card-name', hero.name));
        card.addEventListener('click', () => {
          ctx.hero = hero.id;
          renderHeroes(ctx);
          // On narrow screens the hero is under the cards: there, once picked.
          if (ui.heroInfo.getBoundingClientRect().top > window.innerHeight * 0.6) ui.heroInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return card;
      }),
    );
  }
  // The one picked stays in sight where the cards scroll (sideways, on narrow screens), without moving the page.
  const picked = ui.heroList.querySelector('.picked');
  if (picked) {
    const box = ui.heroList.getBoundingClientRect();
    const at = picked.getBoundingClientRect();
    if (at.left < box.left || at.right > box.right) ui.heroList.scrollLeft += at.left - box.left - 4;
    if (at.top < box.top || at.bottom > box.bottom) ui.heroList.scrollTop += at.top - box.top - 4;
  }
  ui.heroCount.textContent = `${HEROES.length} ${HEROES.length === 1 ? 'hero' : 'heroes'}`;
}

/** The hero picked. */
function renderHero(ctx: DatabankContext): void {
  const { ui } = ctx;
  const hero = heroById(ctx.hero);
  ui.heroInfo.hidden = !hero;
  if (!hero || ui.heroBody.dataset.hero === hero.id) return;
  ui.heroBody.dataset.hero = hero.id;
  ui.heroBody.textContent = '';
  ui.heroInfo.setAttribute('aria-label', hero.name);

  const head = el('div', 'db-class-head db-hero-head');
  const title = el('div', 'detail-title');
  const kind = el('p', 'detail-meta db-kind db-hero-class');
  const badge = el('img');
  badge.src = classBadge(hero.class);
  badge.alt = '';
  // One the site has no picture of shows only its name.
  badge.addEventListener('error', () => badge.remove(), { once: true });
  kind.append(badge, `${className(hero.class)} · TechnoMagic Raid`);
  title.append(el('h3', '', hero.name), kind);
  head.append(picture(hero, BUST, 200, 'db-hero-picture'), title);
  ui.heroBody.append(head);

  // Its stats with no gear on (the class row is in its head).
  const stats = heroStats({ class: hero.class }).filter((section) => section.title !== 'Hero');
  if (stats.length > 0) ui.heroBody.append(label('Stats'), el('p', 'db-boss-note', 'With no gear on: the heroes page has them with yours.'), ...statBlocks(stats));

  const skills = skillRows(hero.id, ctx.databank?.heroes?.find((one) => one.id === hero.id)?.abilities ?? []);
  if (skills.length > 0) {
    const list = el('ol', 'skills-list');
    list.append(...skills);
    ui.heroBody.append(label('Skills'), list);
  }
}

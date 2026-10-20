import { el, treasureParts, uniqueWeaponEffect } from '../shared/items';
import { BUST, classBadge, className, FACE, heroCut, heroPicture, skillText } from '../shared/heroes';
import { closeButton } from '../shared/ui';
import { skillRows } from '../heroes/render';
import { go } from '../site/nav';
import { BOSSES } from '../technomagic/sim/bosses';
import { KR_HEROES } from '../technomagic/sim/heroes/kr';
import type { BossDef } from '../technomagic/sim/bosses/boss';
import type { HeroDef } from '../technomagic/sim/heroes/kit';
import { itemCard, label, portrait, raidOf, recommendedCard } from './bosses';
import { heroById, heroesShown, type DatabankContext } from './context';
import { RECOMMENDED, TEAMMATES } from './recommended';
import type { DatabankItem } from './types';

/*
 * The TechnoMagic Raid's heroes: a card for each down the side (its face and name), A to Z, as the Filter picks
 * them (../shared/ui/hero-filter/: a class, a position, a kind of damage; every hero, owned or not, with no Show owned), and the one picked
 * beside them on parchment, in the bosses' frames: its picture, name, class, the kind of damage it deals and its position,
 * the raids' bosses it's recommended against and its best teammates (./recommended.ts), its unique weapon and treasures (the
 * bot's items), and its skills in King's Raid's own words. The raid itself knows the rest (../technomagic/heroes/).
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

/** The hero's whole picture, big in the middle of the screen over a darkened page; its ✕, a click anywhere or Esc closes it. */
function showPicture(name: string, src: string): void {
  let dialog = document.querySelector<HTMLDialogElement>('dialog.db-hero-zoom');
  if (!dialog) {
    dialog = el('dialog', 'db-hero-zoom');
    dialog.addEventListener('click', () => dialog?.close());
    document.body.append(dialog);
  }
  const img = el('img');
  img.src = src;
  img.alt = name;
  img.draggable = false;
  const close = closeButton();
  close.classList.add('db-hero-zoom-close');
  dialog.setAttribute('aria-label', name);
  dialog.replaceChildren(img, close);
  dialog.showModal();
}

/** The picked hero's bust, which shows its whole picture when clicked (where it has one). */
function bust(hero: HeroDef): HTMLElement {
  const box = picture(hero, BUST, 200, 'db-hero-picture');
  const whole = heroPicture(hero.id);
  if (!whole) return box;
  box.classList.add('db-hero-picture-zoom');
  box.tabIndex = 0;
  box.setAttribute('role', 'button');
  box.setAttribute('aria-label', `See ${hero.name}'s picture`);
  box.addEventListener('click', () => showPicture(hero.name, whole.src));
  box.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    showPicture(hero.name, whole.src);
  });
  return box;
}

/** A boss the hero is recommended against, as the enemies' list has it: it opens the boss there. */
function areaCard(boss: BossDef, kr: boolean): HTMLButtonElement {
  const card = el('button', 'db-boss-card db-area-card');
  card.type = 'button';
  card.append(portrait(boss, 'db-boss-portrait'), el('span', 'db-boss-card-name', boss.name), el('span', 'db-boss-card-kind', raidOf(boss.id)));
  card.title = `${boss.name}${kr ? ': King’s Raid’s own pick' : ''}`;
  if (kr) {
    const thumb = el('img', 'db-area-kr');
    thumb.src = '/kr/ui/thumbs-up.webp';
    thumb.alt = 'King’s Raid’s pick';
    thumb.draggable = false;
    card.append(thumb);
  }
  card.addEventListener('click', () => go(`/databank/bosses/#${encodeURIComponent(boss.id)}`));
  return card;
}

/**
 * The raids' bosses a hero is recommended against (./recommended.ts), their cards as many across as fit; with none, a line
 * saying so, in a row as tall as their cards' (an unseen card holds it open), so the hero's other parts stay where they'd be
 * (also the shop's buy box's, ../hero-shop/).
 */
export function areasOf(id: string): HTMLElement {
  const areas = BOSSES.filter((boss) => RECOMMENDED[boss.id]?.heroes.includes(id));
  const grid = el('div', 'db-areas');
  if (areas.length > 0) grid.append(...areas.map((boss) => areaCard(boss, RECOMMENDED[boss.id]?.kr.includes(id) ?? false)));
  else {
    const spacer = el('span', 'db-areas-spacer');
    spacer.setAttribute('aria-hidden', 'true');
    grid.append(spacer, el('p', 'db-boss-note db-areas-none', 'Not recommended against any of the raids’ bosses.'));
  }
  return grid;
}

/** A position's name (King's Raid's lines, as the heroes' Filter has them). */
const POSITIONS = { front: 'Front', middle: 'Middle', back: 'Back' } as const;

/** The hero's unique weapon, then its unique treasures (UT1 to UT4: its skills' then its passive's), as the databank's items have them. */
const uniqueGear = (ctx: DatabankContext, id: string): DatabankItem[] =>
  (ctx.databank?.items ?? [])
    .filter((item) => item.uniqueWeapon === id || item.uniqueTreasure?.hero === id)
    .sort((a, b) => (a.uniqueTreasure?.skill ?? 0) - (b.uniqueTreasure?.skill ?? 0));

/** One of them: its card (it opens the item in the hero items), and beside it what it does at its top stars (a treasure: as the main one). */
function uniqueRow(item: DatabankItem): HTMLElement {
  const top = item.effects.length;
  const lines = item.effects[top - 1] ?? [];
  const ut = item.uniqueTreasure;
  const kind = ut ? `Unique Treasure ${ut.skill} · ${ut.skill === 4 ? 'Passive' : `Skill ${ut.skill}`}` : 'Unique Weapon';
  const row = el('div', 'db-class-item db-hero-unique');
  const about = el('div', 'db-class-item-about');
  about.append(el('strong', '', item.name), el('small', '', `${kind} · at ★${top}`));
  for (const line of ut ? treasureParts(lines).main : uniqueWeaponEffect(lines)) about.appendChild(el('span', 'db-skill-text')).append(...skillText(line));
  row.append(itemCard(item), about);
  return row;
}

export function renderHeroes(ctx: DatabankContext): void {
  renderHeroList(ctx);
  renderHero(ctx);
}

/** A card for each hero the Filter leaves; picking one shows it. */
function renderHeroList(ctx: DatabankContext): void {
  const { ui } = ctx;
  const shown = heroesShown(ctx);
  // The one shown is one of those (the first, the Filter having left out the one that was; none: none).
  if (!shown.some((hero) => hero.id === ctx.hero)) ctx.hero = shown[0]?.id ?? null;
  ui.heroFilter.show(ctx.heroChoice, true);
  // Drawn again only for another pick or other heroes, so its pictures don't flicker.
  const drawn = `${ctx.hero ?? ''} ${shown.map((hero) => hero.id).join(',')}`;
  if (ui.heroList.dataset.drawn !== drawn) {
    ui.heroList.dataset.drawn = drawn;
    ui.heroList.replaceChildren(
      ...shown.map((hero) => {
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
  ui.heroCount.textContent = shown.length > 0 ? `${shown.length} ${shown.length === 1 ? 'hero' : 'heroes'}` : 'No heroes match these filters';
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
  kind.append(badge, className(hero.class));
  // Under its class, the kind of damage it deals (with King's Raid's mark of it) and its position.
  const deals = el('p', 'detail-meta db-kind db-hero-class');
  const mark = el('img');
  mark.src = `/kr/ui/deals-${hero.stats.deals}.webp`;
  mark.alt = '';
  deals.append(mark, `${hero.stats.deals === 'magical' ? 'Magical' : 'Physical'} damage`);
  const line = KR_HEROES[hero.id]?.stand.line;
  title.append(el('h3', '', hero.name), kind, deals, ...(line ? [el('p', 'detail-meta db-kind db-hero-line', `${POSITIONS[line]} position`)] : []));
  head.append(bust(hero), title);
  ui.heroBody.append(head);

  // The raids' bosses it's recommended against (./recommended.ts), or that there are none.
  ui.heroBody.append(label('Recommended areas of battle'), areasOf(hero.id));

  // The rest of its Main Team: the heroes King's Raid recommends with it, then a priest and those its parties fared best with in the raid's sim.
  const mates = TEAMMATES[hero.id];
  if (mates && mates.heroes.length > 0) {
    const grid = el('div', 'db-recommended');
    grid.append(...mates.heroes.flatMap((id) => recommendedCard(id, mates.kr.includes(id))));
    ui.heroBody.append(label('Recommended teammates'), grid);
  }

  // Its unique weapon and treasures, right over its skills (whose UT each is).
  const unique = uniqueGear(ctx, hero.id);
  if (unique.length > 0) ui.heroBody.append(label('Unique Weapon & Treasures'), ...unique.map(uniqueRow));

  const skills = skillRows(hero.id, ctx.databank?.heroes?.find((one) => one.id === hero.id)?.abilities ?? []);
  if (skills.length > 0) {
    const list = el('ol', 'skills-list');
    list.append(...skills);
    ui.heroBody.append(label('Skills'), list);
  }
}

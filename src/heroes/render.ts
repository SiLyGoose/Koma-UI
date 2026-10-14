import { art, el, hoverSound, itemDetailsClosed, itemFace, itemPicked, lockBadge, matchesSearch, matchesStars, rich, SLOT_NAME, stars as starRow, tmMarks, type StatSection } from '../shared/items';
import { classBadge, className, FACE, HERO_SLOT_KIND, heroCut, heroPicture, type Hero, type HeroCopy, type HeroSlot } from '../shared/heroes';
import { working } from '../shared/ui';
import { copyById, heroShown, mine, slotFor, slotOf, type HeroesContext } from './context';
import { heroSkills } from './skills';
import { heroStats } from './stats';

/*
 * Draws the heroes page from what the bot said (ctx.view): the roster of heroes, the one shown on the stage
 * with its slots, what its gear gives it, the gear a hero can wear (or its stats), and the copy picked.
 */

/** What the page's buttons do (page.ts). */
export interface HeroActions {
  pickHero(id: string): void;
  equip(copy: HeroCopy, slot: HeroSlot): void;
  unequip(slot: HeroSlot): void;
}

/** The armory always shows at least this many cells (rounded up to a full row), and fills out its last row. */
const GRID_CELLS = 12;

/** A slot's name under it. */
const slotName = (slot: HeroSlot): string => SLOT_NAME[HERO_SLOT_KIND[slot]];

/** Whether a copy does anything on `hero`: a class item only on its class. */
const worksOn = (copy: HeroCopy, hero: Hero | undefined): boolean => copy.class === null || copy.class === hero?.class;

export function render(ctx: HeroesContext, act: HeroActions): void {
  const { ui, view } = ctx;
  if (!view) return;
  ui.page.hidden = false;
  const hero = heroShown(ctx);
  ui.page.classList.toggle('unowned', hero?.owned === false);
  ui.filter.show({ slot: ctx.filter, stars: ctx.stars, owned: null, refineable: null, cls: null });
  renderRoster(ctx, act);
  renderStage(ctx);
  renderSlots(ctx);
  renderTotals(ctx);
  renderGrid(ctx, act);
  renderDetail(ctx, act);
  renderStats(ctx);
  renderSkills(ctx);
  ui.armory.classList.toggle('off', ctx.tab !== 'gear');
  ui.stats.classList.toggle('off', ctx.tab !== 'stats');
  ui.skills.classList.toggle('off', ctx.tab !== 'skills');
  for (const tab of ui.views) tab.setAttribute('aria-selected', String(tab.dataset.view === ctx.tab));
  // Someone else's heroes are only to look at.
  ui.unequipAll.hidden = !mine(ctx);
  ui.unequipAll.disabled = !hero?.owned || Object.values(hero.equipped).every((id) => id === null);
  working(ui.unequipAll, ctx.busy, 'unequip-all');
}

/** A picture cut out for a hero, put in `img` once it's ready (its initial in `fallback` until then, or for good with none). */
function showCut(img: HTMLImageElement, id: string, frame: typeof FACE, width: number, fallback: HTMLElement, initial: string): void {
  img.dataset.hero = id;
  fallback.textContent = initial;
  void heroCut(id, frame, width).then((src) => {
    // Still this hero's (another may have been picked meanwhile).
    if (img.dataset.hero !== id) return;
    img.hidden = !src;
    if (src) {
      img.src = src;
      fallback.textContent = '';
    }
  });
}

/**
 * A hero's whole picture in `img` once it's loaded, placed by its face (heroes.css's --face and --face-y: how
 * far across and down the picture its face is); its initial in `fallback` until then, or for good with none, or when it can't be read.
 */
function showWhole(img: HTMLImageElement, id: string, fallback: HTMLElement, initial: string): void {
  img.dataset.hero = id;
  img.hidden = true;
  fallback.textContent = initial;
  const picture = heroPicture(id);
  if (!picture) return;
  img.onload = () => {
    // Still this hero's (another may have been picked meanwhile).
    if (img.dataset.hero !== id) return;
    const { x, y, size } = picture.crop;
    img.style.setProperty('--face', String((x + size / 2) / img.naturalWidth));
    img.style.setProperty('--face-y', String((y + size / 2) / img.naturalHeight));
    img.hidden = false;
    fallback.textContent = '';
  };
  img.src = picture.src;
}

/** Down the left: every hero, theirs first, the one shown framed. */
function renderRoster(ctx: HeroesContext, act: HeroActions): void {
  const { ui, view } = ctx;
  if (!view) return;
  const heroes = [...view.heroes].sort((a, b) => Number(b.owned) - Number(a.owned));
  // Drawn again only when it changes (not on every pick), so its pictures don't flicker.
  const key = `${ctx.hero}|${heroes.map((hero) => `${hero.id}:${hero.owned}`).join(',')}`;
  if (ui.rosterList.dataset.key === key) return;
  ui.rosterList.dataset.key = key;
  ui.rosterList.replaceChildren(
    ...heroes.map((hero) => {
      const tile = el('button', `roster-tile${hero.owned ? '' : ' unowned'}`);
      tile.type = 'button';
      tile.setAttribute('aria-current', String(hero.id === ctx.hero));
      tile.setAttribute('aria-label', `${hero.name}${hero.owned ? '' : ' (not recruited)'}`);
      const face = el('img', 'roster-avatar');
      face.alt = '';
      face.hidden = true;
      const initial = el('span', 'roster-initial');
      showCut(face, hero.id, FACE, 160, initial, hero.name.slice(0, 1));
      const badge = el('span', 'roster-class set');
      const icon = el('img');
      icon.src = classBadge(hero.class);
      icon.alt = '';
      badge.title = className(hero.class);
      badge.append(icon);
      tile.append(initial, face, badge, el('span', 'roster-name', hero.name));
      if (!hero.owned) tile.append(el('span', 'roster-lock', '🔒'));
      tile.addEventListener('click', () => act.pickHero(hero.id));
      return tile;
    }),
  );
}

/** The hero on the stage: its whole picture, name and class (and, not theirs yet, the way to the shop). */
function renderStage(ctx: HeroesContext): void {
  const { ui } = ctx;
  const hero = heroShown(ctx);
  if (!hero) return;
  if (ui.bust.dataset.hero !== hero.id) showWhole(ui.bust, hero.id, ui.initial, hero.name.slice(0, 1));
  ui.name.textContent = hero.name;
  ui.className.textContent = className(hero.class);
  const icon = el('img');
  icon.src = classBadge(hero.class);
  icon.alt = '';
  ui.classIcon.replaceChildren(icon);
  ui.classIcon.title = `Class: ${className(hero.class)}`;
  ui.buy.hidden = hero.owned || !mine(ctx);
  ui.buy.href = '/shop/heroes/';
  ui.armoryTitle.textContent = mine(ctx) ? `${hero.name}'s Gear` : `${ctx.viewing?.name}'s Hero Gear`;
  ui.statsTitle.textContent = `${hero.name}'s Stats`;
  ui.skillsTitle.textContent = `${hero.name}'s Skills`;
}

/** The five slots round the hero: what's in each (or that it's empty), the one last pressed framed. */
function renderSlots(ctx: HeroesContext): void {
  const hero = heroShown(ctx);
  for (const button of ctx.ui.slots) {
    const slot = button.dataset.slot as HeroSlot;
    const copy = copyById(ctx, hero?.equipped[slot] ?? null);
    const kind = HERO_SLOT_KIND[slot];
    button.textContent = '';
    button.dataset.stars = copy ? String(copy.stars) : '';
    button.classList.toggle('empty', !copy);
    if (copy) button.dataset.sfx = 'own';
    else delete button.dataset.sfx;
    button.classList.toggle('masterwork', copy?.masterwork === true);
    button.classList.toggle('filtered', ctx.target === slot && ctx.filter === kind);
    button.setAttribute('aria-label', copy ? `${slotName(slot)}: ${copy.name}` : `${slotName(slot)}: empty`);
    const frame = el('span', 'slot-frame');
    frame.append(art(copy?.itemId ?? null, kind));
    // (TechnoMagic gear has no stars, but its marks: a tier of its own.)
    if (copy) frame.append(el('span', 'slot-level', `R${copy.level}`), ...(copy.heroOnly ? tmMarks(copy.class) : [starRow(copy.stars)]));
    button.append(frame, el('span', 'slot-name', slotName(slot)));
  }
}

/** Under the hero: what everything it wears gives it, all told. */
function renderTotals(ctx: HeroesContext): void {
  const { ui } = ctx;
  const hero = heroShown(ctx);
  ui.totals.textContent = '';
  for (const line of hero?.totals ?? []) ui.totals.appendChild(el('li')).append(rich(line));
  if (!hero?.owned) ui.totals.append(el('li', 'muted', notRecruited(ctx, hero?.name ?? 'this hero', 'give them gear')));
  else if (!hero.totals.length) ui.totals.append(el('li', 'muted', 'Nothing equipped yet.'));
}

/** How many cards across the armory is now. */
const columns = (grid: HTMLElement): number => getComputedStyle(grid).gridTemplateColumns.split(' ').length || 4;

/** The gear a hero can wear: every copy shown (by the filter, the stars and the search), then blanks to fill out the last row. */
function renderGrid(ctx: HeroesContext, act: HeroActions): void {
  const { ui, view, filter, stars, query } = ctx;
  if (!view) return;
  const hero = heroShown(ctx);
  const across = columns(ui.grid);
  const sheet = ui.grid.parentElement as HTMLElement;
  const scrolled = sheet.scrollTop;
  ui.grid.textContent = '';
  const ofSlot = view.copies.filter((copy) => filter === 'all' || copy.slot === filter);
  const shown = ofSlot.filter((copy) => matchesStars(stars, copy.stars, copy.heroOnly) && matchesSearch(query, { name: copy.name, id: copy.itemId, description: copy.description }));
  for (const copy of shown) {
    const card = el('button', 'item');
    card.type = 'button';
    card.dataset.stars = String(copy.stars);
    card.classList.toggle('picked', copy.id === ctx.picked);
    card.classList.toggle('masterwork', copy.masterwork);
    card.classList.toggle('inert', !worksOn(copy, hero));
    const onThis = copy.hero !== null && copy.hero === hero?.id;
    const other = copy.hero !== null && !onThis ? view.heroes.find((one) => one.id === copy.hero) : undefined;
    card.setAttribute('aria-label', `${copy.name}, ${copy.stars} stars, R${copy.level}${onThis ? ', equipped' : other ? `, on ${other.name}` : ''}`);
    if (onThis) card.append(el('span', 'item-tag', 'Equipped'));
    else if (other) card.append(el('span', 'item-tag elsewhere', `On ${other.name}`));
    card.append(...itemFace(copy));
    if (copy.locked) card.append(lockBadge());
    card.dataset.sfx = 'own';
    hoverSound(card, copy.id, () => true);
    card.addEventListener('click', () => {
      const before = ctx.picked;
      ctx.picked = ctx.picked === copy.id ? null : copy.id;
      render(ctx, act);
      itemPicked(before, ctx.picked);
    });
    ui.grid.append(card);
  }
  const row = (n: number): number => Math.ceil(n / across) * across;
  const cells = Math.max(row(GRID_CELLS), row(shown.length));
  for (let i = shown.length; i < cells; i++) ui.grid.append(el('span', 'item blank'));
  if (shown.length === 0) {
    const none = mine(ctx) ? 'No hero gear yet. Raid bosses drop it, the raid shop sells it, and the TechnoMagic Raid drops its own.' : `${ctx.viewing?.name} has no hero gear yet.`;
    ui.grid.append(el('p', 'armory-empty', ofSlot.length > 0 ? 'No items match that.' : filter === 'all' ? none : `No ${SLOT_NAME[filter].toLowerCase()} yet.`));
  }
  sheet.scrollTop = scrolled;
}

/** A copy's effect lines on a hero (or that it has none). */
function effectList(copy: HeroCopy, className = 'detail-effects'): HTMLElement {
  const list = el('ul', className);
  for (const line of copy.effects) list.appendChild(el('li')).append(rich(line));
  if (copy.effects.length === 0) list.append(el('li', 'muted', 'No effects on a hero.'));
  return list;
}

/** The picked copy over the hero: what it does on it, and Equip (where it would go) or Unequip. */
function renderDetail(ctx: HeroesContext, act: HeroActions): void {
  const { ui, view } = ctx;
  const copy = copyById(ctx, ctx.picked);
  const hero = heroShown(ctx);
  ui.detail.hidden = !copy;
  ui.page.classList.toggle('picking', !!copy);
  ui.detail.textContent = '';
  if (!copy || !view || !hero) return;
  ui.detail.dataset.stars = String(copy.stars);
  ui.detail.setAttribute('aria-label', copy.name);

  const bar = el('div', 'detail-bar');
  const close = el('button', 'detail-close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.dataset.sfx = 'own';
  close.addEventListener('click', () => {
    itemDetailsClosed();
    ctx.picked = null;
    render(ctx, act);
  });
  bar.append(el('h3', '', copy.name), close);

  const top = el('div', 'detail-top');
  const card = el('span', 'item detail-card');
  card.dataset.stars = String(copy.stars);
  card.classList.toggle('masterwork', copy.masterwork);
  card.append(...itemFace(copy));
  const info = el('div', 'detail-info');
  const kind = el('p', 'detail-kind', SLOT_NAME[copy.slot]);
  if (copy.level >= copy.maxLevel) kind.append(el('span', 'detail-max', 'MAX'));
  const rank = el('p', 'detail-rank', `R${copy.level}`);
  rank.append(el('span', 'detail-rank-of', ` / ${copy.maxLevel}`));
  info.append(kind, rank);
  if (copy.masterwork) info.append(el('span', 'detail-mw', '✨ Masterwork'));
  top.append(card, info);

  const body = el('div', 'detail-body');
  body.append(el('p', 'detail-desc', copy.description), el('p', 'detail-label', 'On a hero'), effectList(copy));
  if (copy.class !== null && !worksOn(copy, hero)) {
    body.append(el('p', 'detail-note warn', `Only works on ${className(copy.class)}s: on ${hero.name} it does nothing.`));
  }

  const worn = slotOf(hero, copy.id);
  const other = copy.hero !== null && copy.hero !== hero.id ? view.heroes.find((one) => one.id === copy.hero) : undefined;
  const scroll = el('div', 'detail-scroll');
  scroll.append(bar, top, body);
  ui.detail.append(scroll);
  // Someone else's: what it is and who wears it, nothing to change.
  if (!mine(ctx)) {
    if (worn) body.append(el('p', 'detail-note', `${hero.name} wears this.`));
    else if (other) body.append(el('p', 'detail-note', `${other.name} wears this.`));
    return;
  }

  if (other) body.append(el('p', 'detail-note', `${other.name} wears this now: equipping it on ${hero.name} takes it off them.`));
  const into = worn ?? slotFor(ctx, copy);
  const replaced = worn ? undefined : copyById(ctx, hero.equipped[into]);
  if (replaced) body.append(el('p', 'detail-replaces', `Replaces ${replaced.name} (R${replaced.level})`), effectList(replaced, 'detail-effects detail-replaced'));
  if (!hero.owned) {
    body.append(el('p', 'detail-note', notRecruited(ctx, hero.name, 'put gear on them')));
    return;
  }
  const foot = el('div', 'detail-foot');
  const action = el('button', `detail-action action ${worn ? 'secondary' : 'main'}`, worn ? 'Unequip' : `Equip as ${slotLabel(into)}`);
  action.type = 'button';
  working(action, ctx.busy, worn ? `unequip:${worn}` : `equip:${copy.id}`);
  action.addEventListener('click', () => (worn ? act.unequip(worn) : act.equip(copy, into)));
  foot.append(action);
  ui.detail.append(foot);
}

/** A hero that isn't theirs yet: to the shop to `then`; someone else's, that they haven't recruited it. */
const notRecruited = (ctx: HeroesContext, name: string, then: string): string =>
  mine(ctx) ? `Recruit ${name} in the shop to ${then}.` : `${ctx.viewing?.name} hasn't recruited ${name}.`;

/** A slot's name in a sentence: which of two, when there are two of its kind. */
const slotLabel = (slot: HeroSlot): string => (slot === 'treasure' ? 'Treasure' : `${slotName(slot)} ${slot.endsWith('1') ? 'I' : 'II'}`);

/** The Stats tab: the hero's stats in the raid, with and without its gear. */
function renderStats(ctx: HeroesContext): void {
  const { ui } = ctx;
  const hero = heroShown(ctx);
  ui.statsList.textContent = '';
  if (hero) ui.statsList.append(...statBlocks(heroStats(hero)));
}

/** Stats, a heading over each group and a row for each, the base under any that gear changes (the databank's Heroes too). */
export function statBlocks(sections: readonly StatSection[]): HTMLElement[] {
  return sections.map((section) => {
    const block = el('section', 'stats-section');
    block.append(el('h3', '', section.title));
    const list = el('dl');
    for (const row of section.rows) {
      const line = el('div', `stats-row${row.base === null ? '' : ' changed'}`);
      const value = el('dd', '', row.value);
      if (row.base !== null) value.append(el('span', 'stats-base', `base ${row.base}`));
      line.append(el('dt', '', row.label), value);
      list.append(line);
    }
    block.append(list);
    return block;
  });
}

/** A skill's words, as King's Raid marks them: its numbers (20%, 12,000, 0.5) and what's in brackets ([Darkened Power]) each in a colour of their own. */
function skillText(text: string): (string | HTMLElement)[] {
  return text
    .split(/(\[[^\]]+\]|\d+(?:,\d{3})*(?:\.\d+)?%?)/)
    .filter(Boolean)
    .map((part) => (part.startsWith('[') ? el('b', 'skill-effect', part) : /^\d/.test(part) ? el('b', 'skill-number', part) : part));
}

/** The Skills tab: each skill's picture (its number, where there's none), name, cost and cooldown, and what it does; the passive last. */
function renderSkills(ctx: HeroesContext): void {
  const { ui } = ctx;
  const hero = heroShown(ctx);
  // Only redrawn for another hero (its pictures would load again).
  if (!hero || ui.skillsList.dataset.hero === hero.id) return;
  ui.skillsList.dataset.hero = hero.id;
  const skills = skillRows(hero.id);
  ui.skillsList.replaceChildren(...skills);
  if (skills.length === 0) ui.skillsList.append(el('p', 'stats-empty', 'No skills to show for this hero yet.'));
}

/** A row for each of a hero's skills, for a .skills-list (the databank's Heroes too); none for a hero with no words for them. */
export function skillRows(id: string): HTMLElement[] {
  return heroSkills(id).map((skill, i) => {
    const passive = skill.cost === null;
    const item = el('li', 'skill');
    const icon = el('span', 'skill-icon', passive ? 'P' : String(i + 1));
    if (skill.picture) {
      const picture = el('img');
      picture.alt = '';
      picture.src = skill.picture;
      // Not served here (a build leaves the raid's files out): its number stays.
      picture.addEventListener('error', () => picture.remove());
      icon.append(picture);
    }
    const head = el('div', 'skill-head');
    head.append(el('h3', 'skill-name', skill.name));
    head.append(el('span', 'skill-tag', passive ? 'Passive' : `${skill.cost} Mana · ${skill.cooldown}s`));
    const words = el('div', 'skill-words');
    const text = el('p', 'skill-text');
    text.append(...skillText(skill.text));
    words.append(head, text);
    item.append(icon, words);
    return item;
  });
}

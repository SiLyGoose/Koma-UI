import { art, el, hoverSound, itemDetailsClosed, itemFace, itemPicked, lockBadge, matchesSearch, matchesStars, rich, statBlocks, tierOf, SLOT_NAME, stars as starRow, tmMarks, tmSections, uwMarks } from '../shared/items';
import { classBadge, className, FACE, HERO_SLOT_KIND, heroCut, heroPicture, skillText, STAGE_ZOOM, type HeroView, type HeroCopy, type HeroSlot } from '../shared/heroes';
import { doneMark, working } from '../shared/ui';
import { points } from '../shared/util';
import { copyById, heroShown, mine, slotFor, slotOf, type HeroesContext } from './context';
import { heroSkills } from './skills';
import type { HeroSkillView } from '../protocol/heroes';
import { heroStats } from './stats';
import { ESSENCE_NAME, essencePicture, heroPerks, spent, TRANSCEND_MAX, TRANSCEND_POINTS, type EssenceId, type Perk, type TranscendTier } from './transcend';
import { GEM_EMOJI } from '../forge/anvil/gem';

/*
 * Draws the heroes page from what the bot said (ctx.view): the roster of heroes, the one shown on the stage
 * with its slots, what its gear gives it, the gear a hero can wear (or its stats, skills or transcendence perks), and the copy picked.
 */

/** What the page's buttons do (page.ts). */
export interface HeroActions {
  pickHero(id: string): void;
  equip(copy: HeroCopy, slot: HeroSlot): void;
  unequip(slot: HeroSlot): void;
  /** Picks the hero shown's transcendence perks, all of them at once (none: reset); `key` is the button waiting on it. */
  perks(perks: string[], key: string): void;
  /** Transcends the hero shown a level. */
  transcend(): void;
  /** Refines a copy a level (a spare copy of it used up). */
  refine(copy: HeroCopy): void;
}

/** The armory always shows at least this many cells (rounded up to a full row), and fills out its last row. */
const GRID_CELLS = 12;

/** A slot's name under it. */
const slotName = (slot: HeroSlot): string => SLOT_NAME[HERO_SLOT_KIND[slot]];

/** Whether a copy does anything on `hero`: a class item only on its class. */
const worksOn = (copy: HeroCopy, hero: HeroView | undefined): boolean => copy.class === null || copy.class === hero?.class;

/** Whether `hero` may wield a copy at all: anyone, but a unique weapon only its own hero (the bot refuses it on another). */
const wieldable = (copy: HeroCopy, hero: HeroView | undefined): boolean => !copy.uniqueWeapon || copy.uniqueWeapon === hero?.id;

export function render(ctx: HeroesContext, act: HeroActions): void {
  const { ui, view } = ctx;
  if (!view) return;
  ui.page.hidden = false;
  const hero = heroShown(ctx);
  ui.page.classList.toggle('unowned', hero?.owned === false);
  ui.filter.show({ slot: ctx.filter, stars: ctx.stars, owned: null, refineable: null, cls: ctx.cls, heroGear: null });
  renderRoster(ctx, act);
  renderStage(ctx);
  renderSlots(ctx);
  renderTotals(ctx);
  renderGrid(ctx, act);
  renderDetail(ctx, act);
  renderStats(ctx);
  renderAscend(ctx, act);
  renderSkills(ctx);
  renderTranscend(ctx, act);
  ui.armory.classList.toggle('off', ctx.tab !== 'gear');
  ui.stats.classList.toggle('off', ctx.tab !== 'stats');
  ui.skills.classList.toggle('off', ctx.tab !== 'skills');
  ui.transcend.classList.toggle('off', ctx.tab !== 'transcend');
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
    img.style.setProperty('--zoom', String(STAGE_ZOOM[id] ?? 1));
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

/** The hero on the stage: its whole picture, name and class badge (and, not theirs yet, the way to the shop). */
function renderStage(ctx: HeroesContext): void {
  const { ui } = ctx;
  const hero = heroShown(ctx);
  if (!hero) return;
  if (ui.bust.dataset.hero !== hero.id) showWhole(ui.bust, hero.id, ui.initial, hero.name.slice(0, 1));
  ui.name.textContent = hero.name;
  const icon = el('img');
  icon.src = classBadge(hero.class);
  icon.alt = '';
  ui.classIcon.replaceChildren(icon);
  ui.classIcon.title = `Class: ${className(hero.class)}`;
  // Its transcendence beside the banner: a hero of theirs (or someone else's) only, from a bot that says it.
  const level = hero.owned ? hero.transcend?.level : undefined;
  ui.stars.hidden = level === undefined;
  ui.stars.replaceChildren();
  if (level !== undefined) {
    ui.stars.setAttribute('aria-label', `Transcend ${level} of ${TRANSCEND_MAX}`);
    ui.stars.title = `Transcend ${level}`;
    for (let i = 1; i <= TRANSCEND_MAX; i++) ui.stars.append(el('span', `hero-star${i <= level ? ' on' : ''}`, '★'));
  }
  ui.buy.hidden = hero.owned || !mine(ctx);
  ui.buy.href = '/shop/heroes/';
  ui.armoryTitle.textContent = mine(ctx) ? `${hero.name}'s Gear` : `${ctx.viewing?.name}'s Hero Gear`;
  ui.statsTitle.textContent = `${hero.name}'s Stats`;
  ui.skillsTitle.textContent = `${hero.name}'s Skills`;
  ui.transcendTitle.textContent = `${hero.name}'s Transcendence`;
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
    button.classList.toggle('filtered', ctx.target === slot && ctx.filter === kind);
    button.setAttribute('aria-label', copy ? `${slotName(slot)}: ${copy.name}` : `${slotName(slot)}: empty`);
    const frame = el('span', 'slot-frame');
    frame.append(art(copy?.itemId ?? null, kind));
    // (TechnoMagic gear has no stars, but its marks: a tier of its own.)
    if (copy) frame.append(el('span', 'slot-level', `R${copy.level}`), ...(copy.uniqueWeapon ? uwMarks(copy.uniqueWeapon) : copy.heroOnly ? tmMarks(copy.class) : [starRow(copy.stars)]));
    button.append(frame, el('span', 'slot-name', slotName(slot)));
  }
}

/** Under the hero: what everything it wears gives it, all told; and under that, what its picked perks give its stats (only when they give it any). */
function renderTotals(ctx: HeroesContext): void {
  const { ui } = ctx;
  const hero = heroShown(ctx);
  ui.totals.textContent = '';
  for (const line of hero?.totals ?? []) ui.totals.appendChild(el('li')).append(rich(line));
  if (!hero?.owned) ui.totals.append(el('li', 'muted', notRecruited(ctx, hero?.name ?? 'this hero', 'give them gear')));
  else if (!hero.totals.length) ui.totals.append(el('li', 'muted', 'Nothing equipped yet.'));
  const perkEffects = hero?.perkEffects ?? [];
  ui.perkEffectsTitle.hidden = ui.perkEffects.hidden = !perkEffects.length;
  ui.perkEffects.textContent = '';
  for (const line of perkEffects) ui.perkEffects.appendChild(el('li')).append(rich(line));
}

/** How many cards across the armory is now. */
const columns = (grid: HTMLElement): number => getComputedStyle(grid).gridTemplateColumns.split(' ').length || 4;

/** The gear a hero can wear: every copy shown (by the filter, the stars and the search), then blanks to fill out the last row. */
function renderGrid(ctx: HeroesContext, act: HeroActions): void {
  const { ui, view, filter, stars, cls, query } = ctx;
  if (!view) return;
  const hero = heroShown(ctx);
  const across = columns(ui.grid);
  const sheet = ui.grid.parentElement as HTMLElement;
  const scrolled = sheet.scrollTop;
  ui.grid.textContent = '';
  const ofSlot = view.copies.filter((copy) => filter === 'all' || copy.slot === filter);
  const shown = ofSlot.filter((copy) => (cls === 'all' || copy.class === null || copy.class === cls) && matchesStars(stars, tierOf(copy)) && matchesSearch(query, { name: copy.name, id: copy.itemId, description: copy.description }));
  for (const copy of shown) {
    const card = el('button', 'item');
    card.type = 'button';
    card.dataset.stars = String(copy.stars);
    card.classList.toggle('picked', copy.id === ctx.picked);
    card.classList.toggle('inert', !worksOn(copy, hero) || !wieldable(copy, hero));
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
  card.append(...itemFace(copy));
  const info = el('div', 'detail-info');
  const kind = el('p', 'detail-kind', SLOT_NAME[copy.slot]);
  if (copy.level >= copy.maxLevel) kind.append(el('span', 'detail-max', 'MAX'));
  const rank = el('p', 'detail-rank', `R${copy.level}`);
  rank.append(el('span', 'detail-rank-of', ` / ${copy.maxLevel}`));
  info.append(kind, rank);
  top.append(card, info);

  const body = el('div', 'detail-body');
  // (TechnoMagic gear's set effect and additional effect, each apart under them: its potentials are its effects. On a hero of a class it doesn't
  // work on, none of it counts, not even its stats: all of it greyed out.)
  const fits = worksOn(copy, hero);
  const shown = fits ? copy : { ...copy, setEffect: copy.setEffect && { ...copy.setEffect, active: false }, additionalActive: false };
  body.append(el('p', 'detail-desc', copy.description), el('p', 'detail-label', 'On a hero'), effectList(copy, fits ? 'detail-effects' : 'detail-effects off'), ...tmSections(shown));
  if (copy.class !== null && !fits) {
    body.append(el('p', 'detail-note warn', `Only works on ${className(copy.class)}s`));
  }
  const owner = copy.uniqueWeapon ? view.heroes.find((one) => one.id === copy.uniqueWeapon) : undefined;
  if (copy.uniqueWeapon && !wieldable(copy, hero)) body.append(el('p', 'detail-note warn', `${owner?.name ?? 'Another hero'}’s unique weapon: only they can wield it.`));

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
  const foot = el('div', 'detail-foot');
  // A unique weapon: Upgrade, refining it here (a spare copy of it and zeiucoins used up), whoever's page it's on.
  if (copy.uniqueWeapon) foot.append(upgradeFor(ctx, act, copy, body));
  if (!hero.owned) body.append(el('p', 'detail-note', notRecruited(ctx, hero.name, 'put gear on them')));
  // (Another hero's unique weapon: nothing to equip it with here, unless it's to come off.)
  else if (worn || wieldable(copy, hero)) {
    if (copy.uniqueWeapon && !worn) body.append(el('p', 'detail-note', `A unique weapon only goes in ${slotLabel(into)}.`));
    const action = el('button', `detail-action action ${worn ? 'secondary' : 'main'}`, worn ? 'Unequip' : `Equip as ${slotLabel(into)}`);
    action.type = 'button';
    working(action, ctx.busy, worn ? `unequip:${worn}` : `equip:${copy.id}`);
    action.addEventListener('click', () => (worn ? act.unequip(worn) : act.equip(copy, into)));
    foot.append(action);
  }
  if (foot.childElementCount > 0) ui.detail.append(foot);
}

/**
 * A unique weapon's Upgrade: refines it a level, using up a spare copy of it and zeiucoins, with what that costs (and
 * what's in the way, or what it does then) said in `body`. Fully refined, "✓ Max" in its place.
 */
function upgradeFor(ctx: HeroesContext, act: HeroActions, copy: HeroCopy, body: HTMLElement): HTMLElement {
  const { refine } = copy;
  if (copy.level >= copy.maxLevel || refine.blocked === 'maxed') return doneMark('Max');
  const have = ctx.view?.balance ?? 0;
  const cost = refine.cost ?? 0;
  const button = el('button', 'detail-action action secondary', 'Upgrade');
  button.type = 'button';
  button.disabled = refine.blocked !== null;
  working(button, ctx.busy, `refine:${copy.id}`);
  button.addEventListener('click', () => act.refine(copy));
  if (refine.blocked === 'no_duplicate') body.append(el('p', 'detail-note warn', `Upgrading needs another ${copy.name} to use up as material.`));
  else if (refine.blocked === 'too_poor') body.append(el('p', 'detail-note warn', `Upgrading to R${copy.level + 1} costs ${points(cost)} zeiucoins: you need ${points(cost - have)} more.`));
  else {
    const spare = refine.spare !== null && refine.spare > 1 ? ` (an R${refine.spare}: its refinement is lost)` : '';
    body.append(el('p', 'detail-label', `At R${copy.level + 1}`));
    if (refine.after) body.append(effectList({ ...copy, effects: refine.after }));
    body.append(el('p', 'detail-note', `Upgrading costs ${points(cost)} zeiucoins and a spare ${copy.name}${spare}.`));
  }
  return button;
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

/** The Skills tab: each skill's picture (its number, where there's none), name, cost and cooldown, and what it does; the passive last. */
function renderSkills(ctx: HeroesContext): void {
  const { ui } = ctx;
  const hero = heroShown(ctx);
  // Only redrawn for another hero (its pictures would load again).
  if (!hero || ui.skillsList.dataset.hero === hero.id) return;
  ui.skillsList.dataset.hero = hero.id;
  const skills = skillRows(hero.id, hero.abilities ?? []);
  ui.skillsList.replaceChildren(...skills);
  if (skills.length === 0) ui.skillsList.append(el('p', 'stats-empty', 'No skills to show for this hero yet.'));
}

/** A row for each of a hero's skills (as the bot sends them), for a .skills-list (the databank's Heroes too). */
export function skillRows(id: string, skills: readonly HeroSkillView[]): HTMLElement[] {
  return heroSkills(id, skills).map((skill, i) => {
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
    head.append(el('span', 'skill-tag', passive ? (skill.tag ?? 'Passive') : `${skill.cost} Mana · ${skill.tag ?? `${skill.cooldown}s`}`));
    const words = el('div', 'skill-words');
    const text = el('p', 'skill-text');
    text.append(...skillText(skill.text));
    words.append(head, text);
    item.append(icon, words);
    return item;
  });
}

const TIERS: readonly TranscendTier[] = [1, 2, 3, 5];

/** A perk's tier and side, as its tag says it: "Transcend 3 · Light". */
const perkTag = (perk: Perk): string => `Transcend ${perk.tier}${perk.side ? ` · ${perk.side === 'light' ? 'Light' : 'Dark'}` : ''}`;

/**
 * The Transcend tab: the TP left, a row of perks for each tier (the ones learned lit and framed in gold, the rest
 * greyed), and under them the words of the one picked, with Learn or Remove (their own hero's only); Reset Perks under it all.
 */
function renderTranscend(ctx: HeroesContext, act: HeroActions): void {
  const { ui } = ctx;
  const hero = heroShown(ctx);
  if (!hero) return;
  const perks = heroPerks(hero.id, hero.class);
  const learned = hero.perks ?? [];
  const level = hero.transcend?.level ?? TRANSCEND_MAX;
  const points = hero.transcend?.points ?? TRANSCEND_POINTS;
  const left = points - spent(perks, learned);
  ui.tpLeft.textContent = `${left}/${points}`;
  ui.tpLeft.parentElement?.setAttribute('aria-label', `${left} of ${points} TP left`);
  if (ctx.perk && !perks.some((perk) => perk.id === ctx.perk)) ctx.perk = null;

  // The rows drawn again only for another hero (their pictures would load again); what's learned and picked marked on them each time.
  if (ui.perkRows.dataset.hero !== hero.id) {
    ui.perkRows.dataset.hero = hero.id;
    ui.perkRows.replaceChildren(
      ...TIERS.map((tier) => {
        const row = el('section', `perk-row tier-${tier}`);
        row.dataset.tier = String(tier);
        const cells = el('div', 'perk-cells');
        for (const perk of perks.filter((one) => one.tier === tier)) {
          const cell = el('button', 'perk');
          cell.type = 'button';
          cell.dataset.perk = perk.id;
          cell.title = perk.side ? `${perk.name} (${perk.side === 'light' ? 'Light' : 'Dark'})` : perk.name;
          const picture = el('img');
          picture.alt = '';
          picture.src = perk.picture;
          cell.append(picture, el('span', 'perk-cost', String(perk.cost)));
          cell.addEventListener('click', () => {
            ctx.perk = ctx.perk === perk.id ? null : perk.id;
            render(ctx, act);
          });
          cells.append(cell);
        }
        row.append(el('h3', 'perk-tier', `Transcend ${tier}`), cells);
        return row;
      }),
    );
  }
  // A tier past its level: locked, saying when it opens.
  for (const row of ui.perkRows.querySelectorAll<HTMLElement>('.perk-row')) {
    const tier = Number(row.dataset.tier);
    const locked = tier > level;
    row.classList.toggle('locked', locked);
    row.querySelector('.perk-lock')?.remove();
    if (locked) row.querySelector('.perk-tier')?.append(el('span', 'perk-lock', `🔒 at T${tier}`));
  }
  for (const cell of ui.perkRows.querySelectorAll<HTMLButtonElement>('.perk')) {
    const perk = perks.find((one) => one.id === cell.dataset.perk);
    if (!perk) continue;
    const on = learned.includes(perk.id);
    cell.classList.toggle('learned', on);
    cell.setAttribute('aria-pressed', String(ctx.perk === perk.id));
    cell.setAttribute('aria-label', `${perk.name}${perk.side ? ` (${perk.side})` : ''}, ${perk.cost} TP${on ? ', learned' : ''}`);
  }

  // The perk picked: what it does, and what learns or forgets it.
  ui.perkInfo.textContent = '';
  const perk = perks.find((one) => one.id === ctx.perk);
  if (!perk) {
    ui.perkInfo.append(el('p', 'perk-hint', 'Pick a perk to see what it does.'));
  } else {
    const on = learned.includes(perk.id);
    const head = el('div', 'perk-head');
    head.append(el('h3', 'perk-name', perk.name), el('span', 'perk-tag', `${perkTag(perk)} · ${perk.cost} TP`));
    const text = el('p', 'perk-text');
    text.append(...skillText(perk.text));
    ui.perkInfo.append(head, text);
    if (!hero.owned) ui.perkInfo.append(el('p', 'detail-note', notRecruited(ctx, hero.name, 'transcend them')));
    else if (perk.tier > level) ui.perkInfo.append(el('p', 'detail-note warn', `Transcend ${hero.name} to T${perk.tier} (on the Stats tab) to pick this perk.`));
    else if (mine(ctx)) {
      const short = !on && perk.cost > left;
      const action = el('button', `perk-action action ${on ? 'secondary' : 'main'}`, on ? 'Remove' : 'Learn');
      action.type = 'button';
      action.disabled = short;
      working(action, ctx.busy, `perk:${perk.id}`);
      action.addEventListener('click', () => act.perks(on ? learned.filter((id) => id !== perk.id) : [...learned, perk.id], `perk:${perk.id}`));
      ui.perkInfo.append(action);
      if (short) ui.perkInfo.append(el('p', 'detail-note warn', `Needs ${perk.cost} TP: ${left} left. Remove another perk first.`));
    }
  }

  // Someone else's heroes are only to look at.
  ui.resetPerks.hidden = !mine(ctx);
  ui.resetPerks.disabled = !hero.owned || learned.length === 0;
  working(ui.resetPerks, ctx.busy, 'reset-perks');
}

/**
 * At the top of the Stats tab: what transcending is for (more Transcendence Points), then what the hero's next level costs (how far it is, the stars beside its class
 * banner say): each of its class's hero essences, then komaGems, each with how many they have (short in red; for someone
 * else's, only the cost), the komaGems in a box of their own (as King's Raid sets its Stone of Infinity apart), and Transcend
 * beside them. Nothing at T5.
 */
function renderAscend(ctx: HeroesContext, act: HeroActions): void {
  const { ui, view } = ctx;
  const hero = heroShown(ctx);
  ui.ascend.textContent = '';
  const next = hero?.transcend?.next;
  // Fully transcended, or a bot from before transcending: nothing to show.
  ui.ascend.hidden = !hero?.transcend || !next || !view;
  if (!hero?.transcend || !next || !view) return;
  const { level } = hero.transcend;
  const yours = mine(ctx) && hero.owned;
  const costs = el('div', 'ascend-costs');
  const essences = el('div', 'ascend-essences');
  const gems = el('div', 'ascend-gems');
  let short = false;
  const cost = (into: HTMLElement, picture: HTMLElement, name: string, have: number, need: number): void => {
    const lacking = yours && have < need;
    short ||= lacking;
    const item = el('div', `ascend-cost${lacking ? ' short' : ''}`);
    item.title = name;
    item.append(picture, el('span', 'ascend-count', yours ? `${have.toLocaleString('en-US')}/${need}` : `×${need}`));
    into.append(item);
  };
  for (const [id, need] of Object.entries(next.essences) as [EssenceId, number][]) {
    const picture = el('img', 'ascend-icon');
    picture.src = essencePicture(id);
    picture.alt = `${ESSENCE_NAME[id]} essence`;
    cost(essences, picture, `${ESSENCE_NAME[id]} essence`, view.essences?.[id] ?? 0, need);
  }
  const gem = el('span', 'ascend-icon ascend-gem');
  gem.append(rich(GEM_EMOJI));
  cost(gems, gem, 'komaGems', view.gems ?? 0, next.gems);
  costs.append(essences, gems);
  ui.ascend.append(el('p', 'ascend-hint', 'Transcend to unlock more Transcendence Points (TP).'), costs);
  if (!hero.owned) {
    ui.ascend.append(el('p', 'ascend-note', notRecruited(ctx, hero.name, 'transcend them')));
    return;
  }
  if (!mine(ctx)) return;
  const action = el('button', 'ascend-action action main', 'Transcend');
  action.type = 'button';
  action.title = `Transcend ${hero.name} to T${level + 1}`;
  action.disabled = short;
  working(action, ctx.busy, 'transcend');
  action.addEventListener('click', () => act.transcend());
  costs.append(action);
  if (short) ui.ascend.append(el('p', 'ascend-note', 'Beating the weekly raid gives hero essences and komaGems.'));
}

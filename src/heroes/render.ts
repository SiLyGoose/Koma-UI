import { art, drawSell, el, forgeLink, itemDetailsClosed, itemPicked, lockToggle, pruneSale, replacesNote, rich, sellsFor, showDetail, statBlocks, SLOT_NAME, stars as starRow, tmMarks, tmSections, treasureParts, treasureSection, upgradeButton, utMarks, uwMarks } from '../shared/items';
import { classBadge, className, FACE, HERO_SLOT_KIND, heroCut, heroPicture, skillText, STAGE_ZOOM, type HeroView, type HeroCopy, type HeroSlot } from '../shared/heroes';
import { built } from '../shared/built';
import { working } from '../shared/ui';
import { canTrade, copyById, heroShown, mine, slotFor, slotOf, type HeroesContext } from './context';
import { SIDE_SLOTS } from '../protocol/heroes';
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
  /** Locks or unlocks a copy. */
  lock(copy: HeroCopy, locked: boolean): void;
}

/** A slot's name under it (a sub treasure slot's: Sub). */
const slotName = (slot: HeroSlot): string => (SIDE_SLOTS.includes(slot) ? 'Sub' : SLOT_NAME[HERO_SLOT_KIND[slot]]);

/** Whether a copy does anything on `hero`: a class item only on its class. */
const worksOn = (copy: HeroCopy, hero: HeroView | undefined): boolean => copy.class === null || copy.class === hero?.class;

/** Whether `hero` may wield a copy at all: anyone, but a unique weapon only its own hero (the bot refuses it on another). */
const wieldable = (copy: HeroCopy, hero: HeroView | undefined): boolean => (!copy.uniqueWeapon || copy.uniqueWeapon === hero?.id) && (!copy.uniqueTreasure || copy.uniqueTreasure.hero === hero?.id);

export function render(ctx: HeroesContext, act: HeroActions): void {
  const { ui, view } = ctx;
  if (!view) return;
  ui.page.hidden = false;
  const hero = heroShown(ctx);
  ui.page.classList.toggle('unowned', hero?.owned === false);
  ui.filter.show({ slot: ctx.filter, stars: ctx.stars, owned: null, refineable: null, cls: ctx.cls, heroGear: null });
  // Not theirs to sell (someone else's, or the raid's Manage popup); and copies sold, put on or locked meanwhile aren't picked any more.
  if (!canTrade(ctx)) ctx.selling = null;
  if (ctx.selling) pruneSale(view.copies, ctx.selling);
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
  // Someone else's heroes are only to look at. Sell: to start picking, then (with some picked) to confirm.
  ui.unequipAll.hidden = !mine(ctx) || ctx.selling !== null;
  ui.unequipAll.disabled = !hero?.owned || Object.values(hero.equipped).every((id) => id === null);
  working(ui.unequipAll, ctx.busy, 'unequip-all');
  drawSell(ui.sell, ui.sellCancel, view.copies, ctx.selling, ctx.busy, canTrade(ctx));
}

/** A copy picked or put down (or picked to sell, or not): only what that changes, the armory's cards, the details and Sell. */
export function renderPick(ctx: HeroesContext, act: HeroActions): void {
  const { ui, view } = ctx;
  if (!view) return;
  renderGrid(ctx, act);
  renderDetail(ctx, act);
  drawSell(ui.sell, ui.sellCancel, view.copies, ctx.selling, ctx.busy, canTrade(ctx));
}

/** The search changed: only the armory. */
export const renderSearch = (ctx: HeroesContext, act: HeroActions): void => renderGrid(ctx, act);

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
  img.src = built(picture.src);
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

/**
 * The slots round the hero: what's in each (or that it's empty), the one last pressed framed. Its sub treasures are boxes
 * on its main treasure's left edge (grey while empty, green with one in it), shown once it wears a unique treasure.
 */
function renderSlots(ctx: HeroesContext): void {
  const hero = heroShown(ctx);
  const treasure = (slot: HeroSlot): HeroCopy | undefined => copyById(ctx, hero?.equipped[slot] ?? null);
  const subs = ctx.ui.page.querySelector<HTMLElement>('.hero-subs');
  // (Only a unique treasure has sub treasures.)
  if (subs) subs.hidden = !treasure('treasure')?.uniqueTreasure;
  for (const button of ctx.ui.slots) {
    const slot = button.dataset.slot as HeroSlot;
    const copy = copyById(ctx, hero?.equipped[slot] ?? null);
    const kind = HERO_SLOT_KIND[slot];
    if (SIDE_SLOTS.includes(slot)) {
      button.textContent = '';
      button.classList.toggle('empty', !copy);
      button.classList.toggle('filtered', ctx.target === slot && ctx.filter === kind);
      button.title = copy ? `${slotLabel(slot)}: ${copy.name} (R${copy.level})` : `${slotLabel(slot)}: empty`;
      button.setAttribute('aria-label', button.title);
      continue;
    }
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
    if (copy) frame.append(el('span', 'slot-level', `R${copy.level}`), ...(copy.uniqueWeapon ? uwMarks(copy.uniqueWeapon) : copy.uniqueTreasure ? utMarks(copy.uniqueTreasure.hero) : copy.heroOnly ? tmMarks(copy.class) : [starRow(copy.stars)]));
    button.append(frame, el('span', 'slot-name', slotName(slot)));
  }
}

/** Under the hero: what everything it wears gives it, all told; and under that, what its picked perks give its stats (only when they give it any). */
function renderTotals(ctx: HeroesContext): void {
  const { ui } = ctx;
  const hero = heroShown(ctx);
  ui.totals.textContent = '';
  for (const line of hero?.totals ?? []) ui.totals.appendChild(el('li')).append(rich(line));
  // (Its main treasure's effect, when that is one of its own unique treasures: its sub treasures give only their options.)
  if (hero?.treasure) ui.totals.appendChild(el('li', 'hero-ut')).append(rich(`💎 **${hero.treasure.name}** (UT, ★${hero.treasure.tier}): ${hero.treasure.text}`));
  if (!hero?.owned) ui.totals.append(el('li', 'muted', notRecruited(ctx, hero?.name ?? 'this hero', 'give them gear')));
  else if (!hero.totals.length) ui.totals.append(el('li', 'muted', 'Nothing equipped yet.'));
  const perkEffects = hero?.perkEffects ?? [];
  ui.perkEffectsTitle.hidden = ui.perkEffects.hidden = !perkEffects.length;
  ui.perkEffects.textContent = '';
  for (const line of perkEffects) ui.perkEffects.appendChild(el('li')).append(rich(line));
}

/** The gear a hero can wear (../shared/items/armory.ts): every copy shown (by the filter, the stars, the class and the search), then blanks to fill out the last row. */
function renderGrid(ctx: HeroesContext, act: HeroActions): void {
  const { ui, view, filter, stars, cls, query } = ctx;
  if (!view) return;
  const hero = heroShown(ctx);
  ui.grid.draw({
    copies: view.copies,
    slot: filter,
    stars,
    query,
    matches: (copy) => cls === 'all' || copy.class === null || copy.class === cls,
    look: (copy) => {
      const onThis = copy.hero !== null && copy.hero === hero?.id;
      const other = copy.hero !== null && !onThis ? view.heroes.find((one) => one.id === copy.hero) : undefined;
      return {
        tag: onThis ? { text: 'Equipped' } : other ? { text: `On ${other.name}`, className: 'elsewhere' } : null,
        classes: { inert: !worksOn(copy, hero) || !wieldable(copy, hero) },
      };
    },
    picked: ctx.picked,
    selling: ctx.selling,
    none: mine(ctx) ? 'No hero gear yet. Raid bosses drop it, the raid shop sells it, and the TechnoMagic Raid drops its own.' : `${ctx.viewing?.name} has no hero gear yet.`,
    onPick: (copy) => {
      const before = ctx.picked;
      const { selling } = ctx;
      // Picking what to sell: the one picked last is shown over the hero (unpicking it shows the one before).
      if (selling) {
        if (selling.delete(copy.id)) {
          if (ctx.picked === copy.id) ctx.picked = [...selling].at(-1) ?? null;
        } else {
          selling.add(copy.id);
          ctx.picked = copy.id;
        }
      } else ctx.picked = ctx.picked === copy.id ? null : copy.id;
      renderPick(ctx, act);
      itemPicked(before, ctx.picked);
    },
  });
}

/** What a copy's effects say with none. */
const NONE = 'No effects on a hero.';

/** The picked copy over the hero: what it does on it, and Equip (where it would go) or Unequip. */
function renderDetail(ctx: HeroesContext, act: HeroActions): void {
  const { ui, view } = ctx;
  const copy = copyById(ctx, ctx.picked);
  const hero = heroShown(ctx);
  ui.page.classList.toggle('picking', !!copy);
  if (!copy || !view || !hero) return showDetail(ui.detail, undefined);

  // (TechnoMagic gear's set effect and additional effect, each apart under them: its potentials are its effects. On a hero of a class it doesn't
  // work on, none of it counts, not even its stats: all of it greyed out.)
  const fits = worksOn(copy, hero);
  const shown = fits ? copy : { ...copy, setEffect: copy.setEffect && { ...copy.setEffect, active: false }, additionalActive: false };
  const notes: HTMLElement[] = [];
  if (copy.class !== null && !fits) notes.push(el('p', 'detail-note warn', `Only works on ${className(copy.class)}s`));
  const ownerId = copy.uniqueWeapon ?? copy.uniqueTreasure?.hero;
  const owner = ownerId ? view.heroes.find((one) => one.id === ownerId) : undefined;
  if (copy.uniqueWeapon && !wieldable(copy, hero)) notes.push(el('p', 'detail-note warn', `${owner?.name ?? 'Another hero'}’s unique weapon: only they can wield it.`));
  if (copy.uniqueTreasure && !wieldable(copy, hero)) notes.push(el('p', 'detail-note warn', `${owner?.name ?? 'Another hero'}’s unique treasure: only they can wear it.`));

  const worn = slotOf(hero, copy.id);
  const other = copy.hero !== null && copy.hero !== hero.id ? view.heroes.find((one) => one.id === copy.hero) : undefined;
  const actions: HTMLElement[] = [];
  // Being sold: no buttons (the armory's Sell does it), just what it sells for (under its rank, below).
  if (ctx.selling) {
    if (worn) notes.push(el('p', 'detail-note', `${hero.name} wears this.`));
    else if (other) notes.push(el('p', 'detail-note', `${other.name} wears this.`));
  }
  // Someone else's: what it is and who wears it, nothing to change.
  else if (!mine(ctx)) {
    if (worn) notes.push(el('p', 'detail-note', `${hero.name} wears this.`));
    else if (other) notes.push(el('p', 'detail-note', `${other.name} wears this.`));
  } else {
    if (other) notes.push(el('p', 'detail-note', `${other.name} wears this now: equipping it on ${hero.name} takes it off them.`));
    const into = worn ?? slotFor(ctx, copy);
    const replaced = worn ? undefined : copyById(ctx, hero.equipped[into]);
    if (replaced) notes.push(...replacesNote(replaced, NONE));
    // Upgrade: to the forge, with this copy on the anvil (not while a change is on its way), whoever's page it's on.
    actions.push(
      upgradeButton(copy, () => {
        if (!ctx.busy) ctx.host.go(forgeLink(copy));
      }),
    );
    if (!hero.owned) notes.push(el('p', 'detail-note', notRecruited(ctx, hero.name, 'put gear on them')));
    // (Another hero's unique weapon: nothing to equip it with here, unless it's to come off.)
    else if (worn || wieldable(copy, hero)) {
      if (copy.uniqueWeapon && !worn) notes.push(el('p', 'detail-note', `A unique weapon only goes in ${slotLabel(into)}.`));
      // (A unique treasure: its effect only as the main treasure; a sub treasure gives only its options.)
      if (copy.uniqueTreasure) notes.push(el('p', 'detail-note', SIDE_SLOTS.includes(worn ?? into) ? 'As a sub treasure, only its options count: its HP and effect are the main treasure’s alone.' : 'As the main treasure, its HP and effect count too, and it holds up to three sub treasures (only their options count).'));
      // (Worn as a sub treasure: to be its main one, the one there coming off. Not the other way: its sub treasures need a main one.)
      const to = copy.uniqueTreasure && worn && SIDE_SLOTS.includes(worn) ? 'treasure' : null;
      if (to) {
        const move = el('button', 'detail-action action secondary', 'Make Main Treasure');
        move.type = 'button';
        working(move, ctx.busy, `equip:${copy.id}`);
        move.addEventListener('click', () => act.equip(copy, to));
        actions.push(move);
      }
      const action = el('button', `detail-action action ${worn ? 'secondary' : 'main'}`, worn ? 'Unequip' : `Equip as ${slotLabel(into)}`);
      action.type = 'button';
      working(action, ctx.busy, worn ? `unequip:${worn}` : `equip:${copy.id}`);
      action.addEventListener('click', () => (worn ? act.unequip(worn) : act.equip(copy, into)));
      actions.push(action);
    }
  }

  // (A unique treasure: its options as its effects, and what it gives as the main treasure apart, lit while it is this hero's.)
  const ut = copy.uniqueTreasure ? treasureParts(copy.effects) : null;
  showDetail(ui.detail, ut ? { ...copy, effects: ut.options } : copy, {
    onClose: () => {
      itemDetailsClosed();
      ctx.picked = null;
      renderPick(ctx, act);
    },
    label: ut ? 'Options' : 'On a hero',
    none: NONE,
    effectsOff: !fits,
    sections: ut ? treasureSection(ut.main, worn === 'treasure') : tmSections(shown),
    notes,
    // Lock: theirs to toggle on the site (not while picking what to sell); else just shown when shut.
    corner: lockToggle(copy, ctx.busy, canTrade(ctx) && !ctx.selling ? (locked) => act.lock(copy, locked) : null),
    info: ctx.selling ? sellsFor(copy) : [],
    actions,
  });
}

/** A hero that isn't theirs yet: to the shop to `then`; someone else's, that they haven't recruited it. */
const notRecruited = (ctx: HeroesContext, name: string, then: string): string =>
  mine(ctx) ? `Recruit ${name} in the shop to ${then}.` : `${ctx.viewing?.name} hasn't recruited ${name}.`;

/** A slot's name in a sentence: which of two (or three), when there are more of its kind. */
const slotLabel = (slot: HeroSlot): string =>
  slot === 'treasure' ? 'Main Treasure' : SIDE_SLOTS.includes(slot) ? `Sub Treasure ${['I', 'II', 'III'][SIDE_SLOTS.indexOf(slot)]}` : `${slotName(slot)} ${slot.endsWith('1') ? 'I' : 'II'}`;

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

/**
 * A perk's popup, pointed at with a mouse (the raid's own: ../technomagic/hud/tip.ts): its picture, its name, its tier
 * and side and what it costs, then what it does, its numbers marked as the Skills tab's are. Null: no such perk shown.
 */
export function perkTip(ctx: HeroesContext, cell: Element): Node[] | null {
  const hero = heroShown(ctx);
  const perk = hero ? heroPerks(hero.id, hero.class).find((one) => one.id === (cell as HTMLElement).dataset.perk) : undefined;
  if (!perk) return null;
  const art = el('span', 'tm-tip-art');
  const picture = el('img');
  picture.alt = '';
  picture.draggable = false;
  picture.src = perk.picture;
  art.append(picture);
  const facts = el('div', 'tm-tip-facts');
  facts.append(el('strong', 'tm-tip-name', perk.name), el('span', 'tm-tip-cost', perkTag(perk)), el('span', 'tm-tip-cooldown', `${perk.cost} TP`));
  const head = el('div', 'tm-tip-ability');
  head.append(art, facts);
  const about = el('p', 'tm-tip-about');
  about.append(...skillText(perk.text));
  return [head, about];
}

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
          // (Its name for a screen reader; pointed at, the raid's popup: perkTip.)
          cell.setAttribute('aria-label', perk.side ? `${perk.name} (${perk.side === 'light' ? 'Light' : 'Dark'})` : perk.name);
          const picture = el('img');
          picture.alt = '';
          picture.src = perk.picture;
          cell.append(picture, el('span', 'perk-cost', String(perk.cost)));
          cell.addEventListener('click', () => {
            ctx.perk = ctx.perk === perk.id ? null : perk.id;
            renderTranscend(ctx, act);
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

import { el, shownName } from '../shared/items';
import { className, FACE, HERO_PART_NAME, HERO_SLOT_KIND, HERO_SLOT_PART, heroCut, type HeroCopy, type HeroView } from '../shared/heroes';
import { working } from '../shared/ui';
import { coin, points } from '../shared/util';
import { HERO_LOADOUT_SLOTS, HERO_LOADOUTS, type HeroLoadoutView } from '../protocol/heroes';
import { copyById, heroShown, mine, type HeroesContext } from './context';
import { slotFrame } from './parts';
import type { HeroActions } from './render';

/*
 * The heroes page's Loadouts panel (its Loadouts button over the hero's Weapon): King's Raid's Gear Custom (its
 * HeroEquipStoragePanel). The member's numbered gear loadouts, for any of their heroes: HERO_LOADOUTS.free to begin with, the
 * rest locked till bought one at a time (pressing a locked one asks to buy the next, on the site only); each keeps a hero's
 * Armor, Mantle, Accessory, Orb and Artifact. The one picked shows its number, its name (typed in place) and its pieces (one the
 * hero shown can't wear greyed; one another hero wears with that hero's face on it; pressing one shows what it is); Equip puts
 * them on the hero shown (off whoever wears them), Save keeps what the hero shown wears there in it, Reset empties it. A loadout
 * one of their heroes wears has that hero's headshot for its picture. Only their own heroes have it.
 */

/** A loadout's name as shown: the one they gave it, else "Loadout <number>". */
export const loadoutName = (loadout: Pick<HeroLoadoutView, 'number' | 'name'>): string => loadout.name ?? `Loadout ${loadout.number}`;

/** Whether `hero` wears any of a loadout's pieces, in its slot (King's Raid's IsEquippedItemExist). */
const wornBy = (loadout: HeroLoadoutView, hero: HeroView | undefined): boolean =>
  !!hero?.owned && HERO_LOADOUT_SLOTS.some((slot) => !!loadout.pieces[slot] && hero.equipped[slot] === loadout.pieces[slot]);

/** The hero wearing a loadout: of those wearing any of its pieces (in its slots), the one wearing most, the hero shown first (none: nobody). */
function wearerOf(ctx: HeroesContext, loadout: HeroLoadoutView): HeroView | undefined {
  const shown = heroShown(ctx);
  let best: { hero: HeroView; count: number } | undefined;
  for (const hero of ctx.view?.heroes ?? []) {
    if (!hero.owned) continue;
    const count = HERO_LOADOUT_SLOTS.filter((slot) => !!loadout.pieces[slot] && hero.equipped[slot] === loadout.pieces[slot]).length;
    if (count > 0 && (!best || count > best.count || (count === best.count && hero.id === shown?.id))) best = { hero, count };
  }
  return best?.hero;
}

/** Whether a copy does anything on `hero`: King's Raid's gear only on its classes. */
const fitsHero = (copy: HeroCopy, hero: HeroView | undefined): boolean => (copy.classes.length > 0 ? !!hero && copy.classes.includes(hero.class) : copy.class === null || copy.class === hero?.class);

/** The loadout to pick as the panel opens: the first whose pieces the hero shown wears any of, else the first (King's Raid's). */
export function firstLoadout(ctx: HeroesContext): number {
  const hero = heroShown(ctx);
  return ctx.view?.loadouts?.slots.find((loadout) => wornBy(loadout, hero))?.number ?? 1;
}

/** The loadout picked (none: the panel isn't theirs, or they have none). */
const pickedLoadout = (ctx: HeroesContext): HeroLoadoutView | undefined => ctx.view?.loadouts?.slots.find((loadout) => loadout.number === (ctx.loadout ?? 1));

/** The Loadouts button (shown on their own heroes only, pressed while its panel is open), and the panel. */
export function renderLoadouts(ctx: HeroesContext, act: HeroActions): void {
  const { ui, view } = ctx;
  const loadouts = view?.loadouts;
  const theirs = mine(ctx) && loadouts !== undefined;
  ui.loadoutsButton.hidden = !theirs;
  // (Someone else's heroes, or a bot from before them: back to the tab before it.)
  if (!theirs && ctx.tab === 'loadouts') ctx.tab = ctx.tabBefore;
  ui.loadoutsButton.classList.toggle('on', ctx.tab === 'loadouts');
  ui.loadoutsButton.setAttribute('aria-pressed', String(ctx.tab === 'loadouts'));
  if (!loadouts || ctx.tab !== 'loadouts') return;
  if (ctx.loadout === null || ctx.loadout > loadouts.slots.length) ctx.loadout = firstLoadout(ctx);
  renderList(ctx, act);
  renderPicked(ctx, act);
}

/** Every loadout, in order: theirs (picked framed; one a hero wears, that hero's headshot behind it), then the locked ones. */
function renderList(ctx: HeroesContext, act: HeroActions): void {
  const { ui, view } = ctx;
  const loadouts = view?.loadouts;
  if (!loadouts) return;
  const owned = loadouts.slots.length;
  const tiles: HTMLElement[] = [];
  for (let number = 1; number <= HERO_LOADOUTS.most; number++) {
    const loadout = loadouts.slots[number - 1];
    const tile = el('button', 'loadout-slot');
    tile.type = 'button';
    tile.append(el('span', 'loadout-slot-number', String(number)));
    if (loadout) {
      const on = loadout.number === ctx.loadout;
      tile.classList.toggle('on', on);
      tile.classList.toggle('empty', HERO_LOADOUT_SLOTS.every((slot) => !loadout.pieces[slot]));
      tile.setAttribute('aria-pressed', String(on));
      tile.title = loadoutName(loadout);
      tile.append(el('span', 'loadout-slot-name', loadoutName(loadout)));
      const wearer = wearerOf(ctx, loadout);
      if (wearer) {
        tile.classList.add('worn');
        tile.prepend(face(wearer.id, wearer.name, 'loadout-slot-face', 192));
        tile.title += ` (worn by ${wearer.name})`;
      }
      tile.addEventListener('click', () => {
        if (ctx.loadout === loadout.number) return;
        ctx.loadout = loadout.number;
        ctx.picked = null;
        act.redraw();
      });
    } else {
      // (Locked: pressing one asks to buy the next, as King's Raid's; on the site only.)
      tile.classList.add('locked');
      tile.append(el('span', 'loadout-slot-lock', '🔒'));
      const price = loadouts.next;
      tile.disabled = price === null || !ctx.host.site;
      tile.title = !ctx.host.site ? 'Loadouts are bought on the site' : price === null ? 'Locked' : `Locked: buy loadout ${owned + 1} for ${points(price)} zeiucoins`;
      working(tile, ctx.busy, 'loadout-buy');
      tile.addEventListener('click', () => {
        if (price !== null && !ctx.busy) askLoadout(ctx, 'buy', owned + 1, price);
      });
    }
    tile.setAttribute('aria-label', tile.title);
    tiles.push(tile);
  }
  ui.loadoutList.replaceChildren(...tiles);
}

/** The loadout picked: its number and name, its five pieces, a word on what Equip does with them, and Reset, Save and Equip. */
function renderPicked(ctx: HeroesContext, act: HeroActions): void {
  const { ui, view } = ctx;
  const loadout = pickedLoadout(ctx);
  const hero = heroShown(ctx);
  if (!loadout || !view) return;
  ui.loadoutNumber.textContent = String(loadout.number);
  // (Not over what they're typing.)
  if (document.activeElement !== ui.loadoutName) ui.loadoutName.value = loadout.name ?? '';
  ui.loadoutName.placeholder = loadoutName({ number: loadout.number, name: null });
  ui.loadoutName.maxLength = HERO_LOADOUTS.maxNameLength;
  ui.loadoutName.disabled = ctx.busy !== null;

  const pieces = HERO_LOADOUT_SLOTS.map((slot) => ({ slot, copy: copyById(ctx, loadout.pieces[slot] ?? null) }));
  ui.loadoutPieces.replaceChildren(
    ...pieces.map(({ slot, copy }) => {
      const cell = el('button', `slot loadout-piece${copy ? '' : ' empty'}`);
      cell.type = 'button';
      const fits = !copy || fitsHero(copy, hero);
      cell.classList.toggle('unfit', !fits);
      cell.classList.toggle('filtered', !!copy && copy.id === ctx.picked);
      const part = HERO_PART_NAME[HERO_SLOT_PART[slot]];
      const frame = slotFrame(copy, HERO_SLOT_KIND[slot]);
      // (Worn by another hero, whom Equip takes it off: that hero's face over its top edge.)
      const wearer = copy?.hero && copy.hero !== hero?.id ? view.heroes.find((one) => one.id === copy.hero) : undefined;
      if (wearer) frame.append(face(wearer.id, wearer.name, 'loadout-piece-face'));
      cell.append(frame, el('span', 'slot-name', part));
      cell.title = copy ? `${part}: ${shownName(copy)}${wearer ? ` (worn by ${wearer.name})` : ''}${fits ? '' : ` · doesn’t work on ${className(hero?.class ?? '')}s`}` : `${part}: empty`;
      cell.setAttribute('aria-label', cell.title);
      cell.disabled = !copy;
      // (Pressing one shows what it is, over the hero, as a picked copy.)
      cell.addEventListener('click', () => {
        if (!copy) return;
        ctx.picked = ctx.picked === copy.id ? null : copy.id;
        act.redraw();
      });
      return cell;
    }),
  );

  const kept = pieces.filter((piece) => piece.copy);
  const unfit = kept.filter((piece) => piece.copy && !fitsHero(piece.copy, hero));
  const owned = !!hero?.owned;
  const wears = owned && HERO_LOADOUT_SLOTS.some((slot) => !!hero?.equipped[slot]);
  ui.loadoutNote.textContent = !owned
    ? `Recruit ${hero?.name ?? 'this hero'} to put a loadout on them.`
    : kept.length === 0
      ? `Empty. Save keeps ${hero?.name}’s Armor, Mantle, Accessory, Orb and Artifact in it.`
      : unfit.length === kept.length
        ? `Nothing in it works on ${className(hero?.class ?? '')}s.`
        : unfit.length > 0
          ? `Greyed pieces don’t work on ${className(hero?.class ?? '')}s: Equip leaves those slots as they are.`
          : `Equip puts these on ${hero?.name}, off any other hero wearing them.`;

  ui.loadoutEquip.disabled = !owned || kept.length === unfit.length;
  ui.loadoutSave.disabled = !wears;
  ui.loadoutReset.disabled = kept.length === 0;
  working(ui.loadoutEquip, ctx.busy, 'loadout-equip');
  working(ui.loadoutSave, ctx.busy, 'loadout-save');
  working(ui.loadoutReset, ctx.busy, 'loadout-reset');
}

/** A hero's face (`width` wide): behind a loadout a hero wears, or small on a piece another hero wears. */
function face(id: string, name: string, className: string, width = 96): HTMLElement {
  const img = el('img', className);
  img.alt = '';
  img.title = name;
  img.hidden = true;
  void heroCut(id, FACE, width).then((src) => {
    if (!src) return;
    img.src = src;
    img.hidden = false;
  });
  return img;
}

/** What askLoadout asks: saving the hero shown's gear into a loadout, emptying one, or buying the next. */
export type LoadoutAsk = 'save' | 'reset' | 'buy';

/** Asks first, as King's Raid does (its EQUIP_STORAGE_SLOT_* notices): Save, Reset, or buying loadout `number` for `price` zeiucoins. */
export function askLoadout(ctx: HeroesContext, ask: LoadoutAsk, number: number, price = 0): void {
  const dialog = ctx.ui.loadoutConfirm;
  const hero = heroShown(ctx);
  dialog.dataset.ask = ask;
  dialog.dataset.loadout = String(number);
  const what = dialog.querySelector('.loadout-confirm-what') as HTMLElement;
  const name = (n: number): string => {
    const loadout = ctx.view?.loadouts?.slots.find((one) => one.number === n);
    return loadout ? loadoutName(loadout) : `Loadout ${n}`;
  };
  what.textContent = '';
  if (ask === 'save') what.append('Save ', el('b', 'tp-confirm-hero', `${hero?.name ?? 'the hero'}’s`), ' equipped gear into ', el('b', '', name(number)), '? What it keeps now is replaced.');
  else if (ask === 'reset') what.append('Reset ', el('b', '', name(number)), '? Its gear stays where it is; the loadout just keeps none of it.');
  else what.append('Buy ', el('b', '', `Loadout ${number}`), ' for ', el('b', 'perk-page-price', points(price)), ' ', coin('coin', 'zeiucoins'), '?');
  (dialog.querySelector('[data-loadout="confirm"]') as HTMLElement).textContent = ask === 'save' ? 'Save' : ask === 'reset' ? 'Reset' : 'Buy';
  dialog.showModal();
}

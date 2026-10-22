import { el, forgeLink, itemDetailsClosed, lockToggle, optionsSection, replacesNote, sellsFor, showDetail, tmSections, treasureParts, upgradeButton } from '../../shared/items';
import { working } from '../../shared/ui';
import { equip, setLocked, unequip } from './api';
import { copyById, isWorn, mine, wearOnly, type GearContext } from './context';
import { renderGrid } from './grid';

/** What a copy's effects say with none. */
const NONE = 'No effects.';

/** The picked copy's details over the character (../../shared/items/armory.ts): what it does, and what can be done with it. */
export function renderDetail(ctx: GearContext): void {
  const { ui, gear, selling } = ctx;
  const copy = copyById(ctx, ctx.picked);
  ui.gear.classList.toggle('picking', !!copy);
  if (!copy || !gear) return showDetail(ui.detail, undefined);

  const worn = isWorn(ctx, copy);
  const current = worn || !mine(ctx) || selling || copy.heroOnly ? undefined : copyById(ctx, gear.equipped[copy.slot]);
  // Equip, the panel's main button; worn, Unequip, a secondary one (taking it off isn't going anywhere).
  const action = el('button', `detail-action action ${worn ? 'secondary' : 'main'}`, worn ? 'Unequip' : 'Equip');
  action.type = 'button';
  working(action, ctx.busy, worn ? `unequip:${copy.slot}` : `equip:${copy.id}`);
  action.addEventListener('click', () => void (worn ? unequip(ctx, copy.slot) : equip(ctx, copy.id)));

  // Upgrade: to the forge's menu, with this copy (not while a change is on its way).
  const upgrade = upgradeButton(copy, () => {
    if (!ctx.busy) ctx.host.go(forgeLink(copy));
  });

  const notes: HTMLElement[] = [];
  if (copy.borrowed !== null) {
    const who = mine(ctx) ? 'you get' : `${ctx.viewing?.name} gets`;
    notes.push(el('p', 'detail-note', `This one is made for someone else: ${who} ${Math.round(copy.borrowed * 100)}% of its effects.`));
  }
  if (current) notes.push(...replacesNote(current, NONE));
  // TechnoMagic gear: only heroes wear it, so no Equip, but the way to the heroes page.
  if (copy.heroOnly) {
    const note = el('p', 'detail-note', 'TechnoMagic gear: only heroes wear it. Put it on one on the ');
    const link = el('a', '', 'Heroes page');
    link.href = '/heroes/';
    note.append(link, '.');
    notes.push(note);
  }

  // Being sold: no buttons (the armory's Sell does it), just what it sells for. Someone else's: nothing to do with it,
  // so no buttons, just whether they wear it.
  let info: HTMLElement[] = [];
  let actions: HTMLElement[] = [];
  if (selling) info = sellsFor(copy);
  else if (mine(ctx)) actions = [...(wearOnly(ctx) || !upgrade ? [] : [upgrade]), ...(copy.heroOnly && !worn ? [] : [action])];
  else if (worn) info.push(el('span', 'detail-mw detail-worn', 'Equipped'));

  // (TechnoMagic gear's set effect and additional effect, each apart under them (its potentials are its effects): not
  // whether they are on, which goes by the hero wearing it, the heroes page's to say.)
  const { setEffect } = copy;
  // (A unique treasure: what it gives as its hero's main treasure as its Unique Effect, as a unique weapon's is; its options under it.)
  const ut = copy.uniqueTreasure ? treasureParts(copy.effects) : null;
  showDetail(ui.detail, ut ? { ...copy, effects: ut.main } : copy, {
    onClose: () => unpick(ctx),
    label: ut ? 'Unique Effect' : 'Effects',
    none: NONE,
    sections: ut ? optionsSection(ut.options) : tmSections({ ...copy, setEffect: setEffect && { pieces: setEffect.pieces, text: setEffect.text }, additionalActive: undefined }),
    notes,
    // Lock: theirs to toggle on the gear page (not while picking what to sell); anyone else's, just shown when shut.
    corner: lockToggle(copy, ctx.busy, mine(ctx) && !wearOnly(ctx) && !selling ? (locked) => void setLocked(ctx, copy.id, locked) : null),
    info,
    actions,
  });
}

/** Closes the details (the ✕, Escape), with their sound. */
export function unpick(ctx: GearContext): void {
  if (ctx.picked !== null) itemDetailsClosed();
  ctx.picked = null;
  renderGrid(ctx);
  renderDetail(ctx);
}

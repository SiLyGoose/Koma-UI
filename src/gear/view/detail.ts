import { coin, points } from '../../shared/util';
import { el, forgePlan, type GearCopy, itemDetailsClosed, itemFace, rich, SLOT_NAME } from '../../shared/items';
import { doneMark, working } from '../../shared/ui';
import { equip, setLocked, unequip } from './api';
import { copyById, isWorn, mine, wearOnly, type GearContext } from './context';
import { renderGrid } from './grid';
import { padlock } from './padlock';

/** The picked copy's details over the character: what it does, and what can be done with it. */
export function renderDetail(ctx: GearContext): void {
  const { ui, gear, selling } = ctx;
  const copy = copyById(ctx, ctx.picked);
  ui.detail.hidden = !copy;
  ui.gear.classList.toggle('picking', !!copy);
  ui.detail.textContent = '';
  if (!copy || !gear) return;
  ui.detail.dataset.stars = String(copy.stars);
  ui.detail.setAttribute('aria-label', copy.name);

  // Its name across the top, with the close button at the end.
  const bar = el('div', 'detail-bar');
  const close = el('button', 'detail-close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.dataset.sfx = 'own';
  close.addEventListener('click', () => unpick(ctx));
  bar.append(el('h3', '', copy.name), close);

  // Its card, big, beside its slot and rank.
  const top = el('div', 'detail-top');
  const card = bigCard(copy);
  const info = el('div', 'detail-info');
  const kind = el('p', 'detail-kind', SLOT_NAME[copy.slot]);
  if (copy.level >= copy.maxLevel) kind.append(el('span', 'detail-max', 'MAX'));
  const rank = el('p', 'detail-rank', `R${copy.level}`);
  rank.append(el('span', 'detail-rank-of', ` / ${copy.maxLevel}`));
  info.append(kind, rank);
  if (copy.masterwork) info.append(el('span', 'detail-mw', '✨ Masterwork'));
  top.append(card, info);

  const effects = effectList(copy, 'detail-effects');

  const worn = isWorn(ctx, copy);
  const current = worn || !mine(ctx) || selling ? undefined : copyById(ctx, gear.equipped[copy.slot]);
  // Equip, the panel's main button; worn, Unequip, a secondary one (taking it off isn't going anywhere).
  const action = el('button', `detail-action action ${worn ? 'secondary' : 'main'}`, worn ? 'Unequip' : 'Equip');
  action.type = 'button';
  working(action, ctx.busy, worn ? `unequip:${copy.slot}` : `equip:${copy.id}`);
  action.addEventListener('click', () => void (worn ? unequip(ctx, copy.slot) : equip(ctx, copy.id)));

  // Upgrade: to the forge, with this copy on the anvil (not while a change is on its way). With nothing left to
  // do (fully refined, and a masterwork or with no bonus), "✓ Max" in its place.
  let upgrade: HTMLElement = doneMark('Max');
  if (forgePlan(copy).kind !== 'done') {
    const button = el('button', 'detail-action action secondary', 'Upgrade');
    button.type = 'button';
    button.addEventListener('click', () => {
      if (!ctx.busy) ctx.host.go(`/forge/?copy=${encodeURIComponent(copy.id)}`);
    });
    upgrade = button;
  }

  const lock = lockFor(ctx, copy);
  if (lock) top.append(lock);

  // What it does.
  const body = el('div', 'detail-body');
  body.append(el('p', 'detail-desc', copy.description), el('p', 'detail-label', 'Effects'), effects);
  if (copy.borrowed !== null) {
    const who = mine(ctx) ? 'you get' : `${ctx.viewing?.name} gets`;
    body.append(el('p', 'detail-note', `This one is made for someone else: ${who} ${Math.round(copy.borrowed * 100)}% of its effects.`));
  }
  // The copy equipping it would take off, and what it does, set apart from this one's effects.
  if (current) {
    body.append(el('p', 'detail-replaces', `Replaces ${current.name} (R${current.level})`), effectList(current, 'detail-effects detail-replaced'));
  }

  // What can be done with it, under a line along the bottom.
  const foot = el('div', 'detail-foot');
  foot.append(...(wearOnly(ctx) ? [] : [upgrade]), action);
  // All but the buttons scrolls, when it runs longer than the panel.
  const scroll = el('div', 'detail-scroll');
  scroll.append(bar, top, body);
  ui.detail.append(scroll);
  // Being sold: no buttons (the armory's Sell does it), just what it sells for.
  if (selling) {
    if (typeof copy.sell === 'number') {
      const price = el('span', 'detail-mw detail-sells', `Sells for ${points(copy.sell)} `);
      price.append(coin('coin', 'zeiucoins'));
      info.append(price);
    }
  }
  // Someone else's: nothing to do with it, so no buttons, just whether they wear it.
  else if (mine(ctx)) ui.detail.append(foot);
  else if (worn) info.append(el('span', 'detail-mw detail-worn', 'Equipped'));
}

/** A copy's effect lines (or that it has none). */
function effectList(copy: GearCopy, className: string): HTMLElement {
  const list = el('ul', className);
  for (const line of copy.effects) list.appendChild(el('li')).append(rich(line));
  if (copy.effects.length === 0) list.append(el('li', 'muted', 'No effects.'));
  return list;
}

/**
 * Lock: a padlock in the top corner, shut when it's kept from being sold or used up by a refine.
 * Only yours to toggle (not while picking what to sell); on anyone else's, just shown when shut. A bot
 * from before locking has nothing to show.
 */
function lockFor(ctx: GearContext, copy: GearCopy): HTMLElement | null {
  if (copy.locked === undefined) return null;
  if (mine(ctx) && !wearOnly(ctx) && !ctx.selling) {
    const lock = el('button', 'detail-lock action secondary icon');
    lock.type = 'button';
    working(lock, ctx.busy, `lock:${copy.id}`);
    lock.classList.toggle('on', copy.locked);
    lock.setAttribute('aria-pressed', String(copy.locked));
    lock.setAttribute('aria-label', 'Locked');
    lock.title = copy.locked ? 'Locked: unlock to let it be sold or used up by a refine again' : 'Lock to keep it from being sold or used up by a refine';
    lock.append(padlock(copy.locked));
    lock.addEventListener('click', () => void setLocked(ctx, copy.id, !copy.locked));
    return lock;
  }
  if (!copy.locked) return null;
  const lock = el('button', 'detail-lock action secondary icon on');
  lock.type = 'button';
  lock.disabled = true;
  lock.setAttribute('aria-pressed', 'true');
  lock.setAttribute('aria-label', 'Locked');
  lock.title = 'Locked';
  lock.append(padlock(true));
  return lock;
}

/** A copy's card, big (the detail panel's). */
function bigCard(copy: GearCopy): HTMLElement {
  const card = el('span', 'item detail-card');
  card.dataset.stars = String(copy.stars);
  card.classList.toggle('masterwork', copy.masterwork);
  card.append(...itemFace(copy));
  return card;
}

/** Closes the details (the ✕, Escape), with their sound. */
export function unpick(ctx: GearContext): void {
  if (ctx.picked !== null) itemDetailsClosed();
  ctx.picked = null;
  renderGrid(ctx);
  renderDetail(ctx);
}

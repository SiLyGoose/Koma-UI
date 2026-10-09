import { characterOf } from '../../shared/characters';
import { el, rich } from '../../shared/items';
import { copyById, mine, wearOnly, type GearContext } from './context';
import { renderDetail } from './detail';
import { renderFoot } from './foot';
import { renderGrid } from './grid';
import { renderRoster } from './roster';
import { renderSlots } from './slots';
import { renderStats } from './stats';

/** Draws the whole view: the character and their slots, the armory or stats beside them, and the roster. */
export function render(ctx: GearContext): void {
  const { ui, viewing } = ctx;
  const me = ctx.host.me();
  if (!ctx.gear || (!me && !viewing)) return;
  ui.gear.hidden = false;
  const name = viewing?.name ?? me?.user.name ?? '';
  ui.gear.classList.toggle('peeking', !mine(ctx));
  // Someone else's gear isn't theirs to sell; and copies sold, or put on, meanwhile aren't picked any more.
  if (!mine(ctx) || wearOnly(ctx)) ctx.selling = null;
  for (const id of ctx.selling ?? []) if (typeof copyById(ctx, id)?.sell !== 'number') ctx.selling?.delete(id);
  ui.heroName.textContent = name;
  const character = characterOf(ctx.gear.outfit);
  if (ui.sprite.getAttribute('src') !== character.sprite) ui.sprite.src = character.sprite;
  ui.sprite.width = character.width;
  ui.sprite.height = character.height;
  ui.armoryTitle.textContent = `${name}'s Armory`;
  ui.statsTitle.textContent = `${name}'s Stats`;
  for (const tab of ui.tabs) tab.setAttribute('aria-selected', String(tab.dataset.filter === ctx.filter));
  renderSlots(ctx);
  renderGrid(ctx);
  renderDetail(ctx);
  renderFoot(ctx);
  renderTotals(ctx);
  renderStats(ctx);
  renderView(ctx);
  renderRoster(ctx);
}

/** Which of the armory and the stats shows beside the character, and its tab picked. */
function renderView(ctx: GearContext): void {
  const { ui, view } = ctx;
  // Not `hidden`: on wide screens the one not shown still keeps the row as tall as the other (gear.css).
  ui.armory.classList.toggle('off', view !== 'gear');
  ui.stats.classList.toggle('off', view !== 'common');
  for (const tab of ui.views) tab.setAttribute('aria-selected', String(tab.dataset.view === view));
}

/** Under the character: what everything they wear does, all told. */
function renderTotals(ctx: GearContext): void {
  const { ui, gear } = ctx;
  ui.totals.textContent = '';
  for (const line of gear?.totals ?? []) ui.totals.appendChild(el('li')).append(rich(line));
  if (!gear?.totals.length) ui.totals.append(el('li', 'muted', 'Nothing equipped yet.'));
}

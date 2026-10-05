import { art, el, rich, SLOT_NAME, stars } from '../shared/items/items';
import { itemDetailsClosed } from '../shared/items/sfx';
import { itemById, narrow, type DatabankContext } from './context';

function levelButton(label: string, pressed: boolean, disabled: boolean, onClick: () => void): HTMLButtonElement {
  const button = el('button', 'db-level', label);
  button.type = 'button';
  button.setAttribute('aria-pressed', String(pressed));
  button.disabled = disabled;
  button.addEventListener('click', onClick);
  return button;
}

/** The panel: the item picked, what it does at the level picked, and what they own of it. */
export function renderDetail(ctx: DatabankContext): void {
  const { ui, databank, level } = ctx;
  const item = itemById(ctx, ctx.picked);
  ui.detailBody.textContent = '';
  ui.detailOwned.hidden = true;
  ui.detail.hidden = !item || (narrow.matches && !ctx.sheetOpen);
  if (!item || !databank) return;
  const { maxLevel } = databank;
  ui.detail.dataset.stars = String(item.stars);
  ui.detail.setAttribute('aria-label', item.name);

  const head = el('div', 'detail-head');
  const title = el('div', 'detail-title');
  const name = el('h3', '', item.name);
  const bonusOn = ctx.masterwork && level === maxLevel && item.masterwork !== null;
  if (bonusOn) name.append(el('span', 'detail-mw', '✨ Masterwork'));
  // Under the name, its category, then its stars (as the gear page's item panel).
  title.append(name, el('p', 'detail-meta db-kind', SLOT_NAME[item.slot]), stars(item.stars));
  const close = el('button', 'detail-close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.dataset.sfx = 'own';
  close.addEventListener('click', () => {
    itemDetailsClosed();
    ctx.sheetOpen = false;
    renderDetail(ctx);
  });
  head.append(art(item.id, item.slot), title, close);

  // The level picker: R1 to the top, then the masterwork (only items with a bonus have one).
  const levels = el('div', 'db-levels');
  levels.setAttribute('aria-label', 'Refinement level');
  for (let l = 1; l <= maxLevel; l++) {
    levels.append(
      levelButton(`R${l}`, l === level && !bonusOn, false, () => {
        ctx.level = l;
        ctx.masterwork = false;
        renderDetail(ctx);
      }),
    );
  }
  if (item.masterwork !== null) {
    levels.append(
      levelButton('✨', bonusOn, false, () => {
        ctx.level = maxLevel;
        ctx.masterwork = true;
        renderDetail(ctx);
      }),
    );
  }

  const lines = bonusOn ? (item.masterwork ?? []) : (item.effects[level - 1] ?? []);
  const effects = el('ul', 'detail-effects');
  for (const line of lines) effects.appendChild(el('li')).append(rich(line));
  if (lines.length === 0) effects.append(el('li', 'muted', 'No effects.'));

  ui.detailBody.append(head, el('p', 'detail-desc', item.description), levels, effects);
  // At the top level the effects already name the (locked) bonus.
  if (item.masterwork !== null && level < maxLevel) {
    ui.detailBody.append(el('p', 'detail-note', `Has a masterwork bonus at R${maxLevel}: press ✨ to see it.`));
  }
  // Last of what scrolls: at the bottom, just over the line, when there's room.
  if (item.borrowed !== null) {
    ui.detailBody.append(
      el('p', 'detail-note db-made-for', `Made for certain members. Anyone else can wear it for ${Math.round(item.borrowed * 100)}% of its effects.`),
    );
  }
  const mine = ctx.owned?.get(item.id);
  if (ctx.owned) {
    ui.detailOwned.hidden = false;
    ui.detailOwned.textContent = mine ? `You own ${mine.count} ${mine.count === 1 ? 'copy' : 'copies'}, the best at R${mine.best}.` : "You don't own this one yet.";
  }
}

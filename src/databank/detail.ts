import { art, el, rich, SLOT_NAME, stars } from '../shared/items/items';
import { itemDetailsClosed } from '../shared/items/sfx';
import { go } from '../site/nav';
import { currentServer } from '../site/session';
import { itemById, narrow, type DatabankContext } from './context';
import type { ItemSource } from './types';

function levelButton(label: string, pressed: boolean, disabled: boolean, onClick: () => void): HTMLButtonElement {
  const button = el('button', 'db-level', label);
  button.type = 'button';
  button.setAttribute('aria-pressed', String(pressed));
  button.disabled = disabled;
  button.addEventListener('click', onClick);
  return button;
}

/**
 * A box for one place an item comes from: its icon, its name, and a word on it. The raid's opens the raid (through
 * the front page, as Discord's links do: it logs them in first if need be); the gacha's is in Discord, so it only
 * clicks.
 */
function sourceBox(source: ItemSource, dropChance: number | undefined): HTMLButtonElement {
  const box = el('button', 'db-source');
  box.type = 'button';
  box.dataset.source = source;
  const text = el('span', 'db-source-text');
  if (source === 'gacha') {
    box.title = "Pulled with Koma's gacha in Discord";
    text.append(el('span', 'db-source-name', 'Gacha'), el('span', 'db-source-hint', 'Pull it in Discord'));
    box.append(el('span', 'db-source-icon', '🎰'), text);
    return box;
  }
  const odds =
    dropChance === undefined ? 'Raid bosses drop it' : dropChance > 0 ? `${Math.round(dropChance * 1000) / 10}% drop chance per win` : 'Drops are off right now';
  box.title = 'Play the raid';
  text.append(el('span', 'db-source-name', 'Raid'), el('span', 'db-source-hint', odds));
  box.append(el('span', 'db-source-icon', '⚔️'), text, el('span', 'db-source-go', '→'));
  box.addEventListener('click', () => {
    const server = currentServer();
    go(`/?play=raid${server ? `&guild=${encodeURIComponent(server)}` : ''}`);
  });
  return box;
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
  // Where it comes from, a box for each place (nothing from a bot that doesn't say).
  const sources = item.source ? [item.source] : [];
  if (sources.length > 0) {
    const section = el('div', 'db-sources');
    const boxes = el('div', 'db-source-boxes');
    for (const source of sources) boxes.append(sourceBox(source, databank.raidDropChance));
    section.append(el('p', 'db-sources-label', 'Obtainable from'), boxes);
    ui.detailBody.append(section);
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

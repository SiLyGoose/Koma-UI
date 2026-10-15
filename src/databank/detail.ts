import { art, effectSection, el, itemDetailsClosed, rich, SLOT_NAME, stars, tmTier, uwTier } from '../shared/items';
import { go } from '../site/nav';
import { SKILLS } from '../technomagic/sim/skills';
import { classTag } from './class-tag';
import { className, itemById, narrow, type DatabankContext } from './context';
import type { ItemSource } from './types';

function levelButton(label: string, pressed: boolean, disabled: boolean, onClick: () => void): HTMLButtonElement {
  const button = el('button', 'action choice db-level', label);
  button.type = 'button';
  button.setAttribute('aria-pressed', String(pressed));
  button.disabled = disabled;
  button.addEventListener('click', onClick);
  return button;
}

/** Each place an item comes from: its box's words. */
const SOURCES: Record<ItemSource, string> = {
  gacha: 'Gacha - Discord',
  raid: 'Raid Drops',
  raidShop: 'Raid Shop',
  limited: 'Limited Banner',
  technomagic: 'TechnoMagic Raid',
  heroBanner: 'Hero Item Banner',
};

/**
 * Where each place's box goes: the databank's raid bosses (./bosses.ts), which say what they drop, the
 * shop's Raid Gear tab (../raid-shop/), for TechnoMagic gear (which only heroes wear) the heroes page
 * (../heroes/), and for a unique weapon the shop's wish tab, where the Hero Item banner is. The gacha's is in
 * Discord, so it only clicks.
 */
const SOURCE_PAGE: Partial<Record<ItemSource, string>> = {
  raid: '/databank/bosses/',
  raidShop: '/shop/raid/',
  technomagic: '/heroes/',
  heroBanner: '/shop/wish/',
};

/** A box for one place an item comes from. */
function sourceBox(source: ItemSource): HTMLButtonElement {
  const box = el('button', 'db-source');
  box.type = 'button';
  box.append(el('span', 'db-source-name', SOURCES[source] ?? source));
  const page = SOURCE_PAGE[source];
  if (page) box.addEventListener('click', () => go(page));
  return box;
}

/**
 * TechnoMagic gear's additional skills: each copy comes with one of them, at random as it drops (the same list
 * whatever its set), folded away under a line that says so. By the tier list's tiers (../technomagic/sim/skills.ts).
 */
function skillList(): HTMLElement {
  const box = el('details', 'detail-note db-skills');
  box.append(el('summary', '', `Each copy comes with one of ${SKILLS.length} additional skills, at random.`));
  const list = el('ul', 'detail-effects');
  for (const skill of SKILLS) list.appendChild(el('li')).append(rich(`**${skill.name}** (${skill.tier}): ${skill.about}`));
  box.append(list);
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
  // Under the name, its category, then its stars (as the gear page's item panel); TechnoMagic gear and a unique weapon, their tiers of their own.
  title.append(name, el('p', 'detail-meta db-kind', SLOT_NAME[item.slot]), item.source === 'technomagic' ? tmTier() : item.source === 'heroBanner' ? uwTier() : stars(item.stars));
  // A class item says whose it is; TechnoMagic gear, its set (three pieces on a hero give its effect, for the hero's class: its effects say it too).
  if (item.class) title.append(classTag(item.class, className(ctx, item.class)));
  if (item.set) {
    const set = el('p', 'detail-meta db-set', `${item.set.name} set · ${item.set.boss[0]?.toUpperCase()}${item.set.boss.slice(1)}`);
    const effect = item.class ? item.set.effects[item.class] : undefined;
    set.title = `Three of its weapons and armors on a hero: ${effect ?? 'nothing for its class'}`;
    title.append(set);
  }
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
  // TechnoMagic gear: its set effect, then its additional effect (one of them, at random), each apart under its effects (the potentials a copy can roll).
  if (item.set?.pieces && item.set.effect) ui.detailBody.append(effectSection(`${item.set.pieces}-set effect:`, item.set.effect));
  if (item.source === 'technomagic') ui.detailBody.append(effectSection('Additional Effect:', skillList()));
  // Where it comes from, a box for each place (nothing from a bot that doesn't say).
  const sources = item.sources ?? (item.source ? [item.source] : []);
  if (sources.length > 0) {
    const section = el('div', 'db-sources');
    const boxes = el('div', 'db-source-boxes');
    for (const source of sources) boxes.append(sourceBox(source));
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

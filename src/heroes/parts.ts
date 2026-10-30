import { art, el, heroFrame, heroMarks, isTmPiece, krStars, rich, runeMarks } from '../shared/items';
import type { Slot } from '../protocol/items';
import type { HeroCopy, HeroRune } from '../protocol/heroes';

/*
 * The parts of a hero piece's details the heroes page draws (./render.ts) and the inventory's Hero Gear (../inventory/tabs/gear.ts)
 * too: a King's Raid piece's unique option and set bonuses, its rune sockets, what it does without its runes' lines, and a
 * rune's picture; and a slot's frame with what's in it (the stage's slots, and a gear loadout's: ./loadouts.ts).
 */

/** A slot's frame (`kind`, its kind of item: its empty picture): its piece's picture, frame, marks, rune sockets and stars, King's Raid's. */
export function slotFrame(copy: HeroCopy | undefined, kind: Slot): HTMLElement {
  const frame = el('span', 'slot-frame');
  frame.append(art(copy?.itemId ?? null, kind));
  if (copy) frame.append(heroFrame(copy), ...heroMarks(copy), ...runeMarks(copy.runes), krStars(copy.level, copy.level, isTmPiece(copy.itemId)));
  return frame;
}

/** A rune's picture in the Runes list: its icon, its kind's gem on its corner. */
export function runePic(rune: HeroRune): HTMLElement {
  const pic = el('span', 'rune-pic');
  const icon = el('img');
  icon.src = `/kr/items/${rune.icon}.webp`;
  icon.alt = '';
  icon.loading = 'lazy';
  pic.append(icon, el('span', `kr-rune ${rune.color}`));
  return pic;
}

/** A section of a King's Raid piece's: its title, then its rows. */
export function krSection(title: string, rows: HTMLElement[], className = ''): HTMLElement {
  const section = el('section', `kr-section ${className}`.trim());
  section.append(el('h4', 'kr-section-title', title), ...rows);
  return section;
}

/**
 * King's Raid's gear's parts in the detail, under its effects (its options are among those): its unique option (its
 * additional skill) and its set's bonuses (lit while on; picked to equip, `pieces`: lit too where equipping it would turn
 * them on, with a tag saying so). Its options' steps, rerolling and enhancing them are the forge's (its Upgrade).
 */
export function krSections(copy: HeroCopy, fits: boolean, pieces: { now: number; equipped: number } | null = null): HTMLElement[] {
  const out: HTMLElement[] = [];
  if (copy.additional) {
    const row = el('div', `kr-option${copy.additionalActive ? '' : ' off'}`);
    row.append(rich(copy.additional));
    out.push(krSection('Unique Option', [row]));
  }
  if (copy.setBonuses.length > 0 && copy.krSet) {
    out.push(krSection(`${copy.krSet.name} Set${copy.krSet.tier < 9 ? ` · T${copy.krSet.tier}` : ''}`, copy.setBonuses.map((bonus) => {
      // (Picked to equip: on as this hero would have it, not as whoever wears it now.)
      const on = pieces ? pieces.equipped >= bonus.pieces : bonus.active;
      const gain = on && pieces !== null && pieces.now < bonus.pieces;
      const row = el('p', `kr-bonus${on ? ' on' : ''}${gain ? ' gain' : ''}`, `${bonus.pieces} pieces: ${bonus.text}`);
      if (gain) row.append(el('span', 'kr-bonus-tag', 'On equip'));
      return row;
    })));
  }
  return out;
}

/** What a piece does on a hero without its runes' lines (the bot's effects end with them: one taken off for each, from the last). */
export function withoutRunes(copy: HeroCopy): string[] {
  const effects = [...copy.effects];
  for (const line of copy.runes.flatMap((rune) => rune?.lines ?? [])) {
    const at = effects.lastIndexOf(line);
    if (at >= 0) effects.splice(at, 1);
  }
  return effects;
}

/**
 * Any hero piece's rune sockets in the detail (a King's Raid piece's, a TechnoMagic one's, a unique weapon's): a rune in each,
 * with what it gives. Putting them in and taking them out is its Runes, in the cards' place.
 */
export function runeSection(copy: HeroCopy): HTMLElement[] {
  const out: HTMLElement[] = [];
  if (copy.runes.length > 0) {
    const rows = copy.runes.map((rune) => {
      const row = el('div', 'kr-socket');
      if (rune) {
        const icon = el('img', 'kr-rune-icon');
        icon.src = `/kr/items/${rune.icon}.webp`;
        icon.alt = '';
        // (What it gives, its name left to its Runes list.)
        icon.title = rune.name;
        row.append(icon, el('span', 'kr-rune-name', rune.lines.join(', ')));
        return row;
      }
      // (Their runes to put in: its Runes, below, lists them in the cards' place.)
      row.append(el('span', 'kr-rune-name muted', 'Empty Socket'));
      return row;
    });
    out.push(krSection('Runes', rows));
  }
  return out;
}

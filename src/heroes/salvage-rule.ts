import { el, priceOf, stoneCount } from '../shared/items';
import { HERO_CLASSES, type HeroCopy } from '../shared/heroes';
import { HERO_PART_NAME, SALVAGE_PARTS, SALVAGE_STARS_MAX, SALVAGE_TIERS, type HeroPart, type SalvageRule } from '../protocol/heroes';
import type { RaidClassId } from '../protocol/raid';
import { dust, points } from '../shared/util';
import type { HeroesContext } from './context';

/*
 * Salvage by rule, on the heroes page while picking copies to sell (its By rule): which hero gear to salvage, by its
 * tier (T6 to T9: the dragon sets' and the TechnoMagic sets'), its stars (at most), its part and the classes it is for
 * (none picked: any), as the bot's protocol/heroes.ts SalvageRule. Pick picks every piece it takes that can be salvaged
 * (never one worn, in a loadout or on a hero, or one with a rune in it; a locked one only with Include locked checked), for the armory's Salvage; and
 * kept with Save (Salvage drops like these), the TechnoMagic and Dragon Raids salvage the drops it takes as they drop.
 * Its markup is the page's <dialog id="salvage-rule">, which this fills.
 */

/** A rule to start from, with none kept or used yet: the lowest tier, at 0★. */
const FIRST_RULE: SalvageRule = { tiers: [6], stars: 0, parts: [], classes: [] };

/**
 * Whether `rule` takes a piece (as the bot's lib/game/items/salvage.ts salvageMatches, which salvages drops by it): King's
 * Raid's gear of a tier it picks, at its stars or fewer, of a part it picks (none: any), and for none but the classes it
 * picks (none: any; gear other classes wear too, or any class, is kept).
 */
export function salvageMatches(rule: SalvageRule, piece: { tier: number | null; stars: number; part: HeroPart; classes: readonly string[] }): boolean {
  if (piece.tier === null || !SALVAGE_TIERS.includes(piece.tier) || !rule.tiers.includes(piece.tier)) return false;
  if (piece.stars > rule.stars) return false;
  if (rule.parts.length > 0 && !rule.parts.includes(piece.part)) return false;
  if (rule.classes.length === 0) return true;
  return piece.classes.length > 0 && piece.classes.every((cls) => (rule.classes as readonly string[]).includes(cls));
}

/**
 * The pieces `rule` picks among `copies`: hero gear it takes that can be salvaged as it is (not kept or socketed; not
 * locked either, but with `unlocked`: Include locked checked).
 */
export const rulePicks = (copies: readonly HeroCopy[], rule: SalvageRule, unlocked = false): HeroCopy[] =>
  copies.filter(
    (copy) =>
      copy.salvage !== undefined &&
      priceOf(copy, unlocked) !== null &&
      !copy.runes.some((rune) => rune !== null) &&
      salvageMatches(rule, { tier: copy.krSet?.tier ?? null, stars: copy.level, part: copy.part, classes: copy.classes }),
  );

/** What the dialog does with a rule: picks the pieces it takes (their ids), or keeps it for their drops (null: none). */
export interface SalvageRuleHooks {
  pick(ids: string[]): void;
  save(rule: SalvageRule | null): void;
}

/** Fills and wires the page's Salvage by rule dialog; `open` shows it, starting from the rule kept (or the last one used). */
export function salvageRuleDialog(dialog: HTMLDialogElement, ctx: Pick<HeroesContext, 'view' | 'sellLocked'>, hooks: SalvageRuleHooks): { open(): void } {
  /** The last rule picked by, for the next time it opens (with none kept). */
  let last: SalvageRule | null = null;
  let rule: SalvageRule = FIRST_RULE;

  /** A choice: its (hidden) radio or checkbox, its mark, and its words (the Filter's look: armory-filter.css). */
  const option = (type: 'radio' | 'checkbox', name: string, value: string, label: string | HTMLElement): HTMLLabelElement => {
    const row = el('label', 'armory-filter-option');
    const input = el('input');
    input.type = type;
    input.name = `salvage-${name}`;
    input.value = value;
    row.append(input, el('span', 'armory-filter-mark'), label);
    return row;
  };
  const group = (title: string, className: string, options: HTMLElement[]): HTMLFieldSetElement => {
    const set = el('fieldset', `armory-filter-group ${className}`);
    const choices = el('div', 'armory-filter-options');
    choices.append(...options);
    set.append(el('legend', '', title), choices);
    return set;
  };
  const classLabel = (id: string, name: string): HTMLElement => {
    const label = el('span', 'armory-filter-class');
    const badge = el('img');
    badge.src = `/gear/classes/${id}.png`;
    badge.alt = '';
    badge.draggable = false;
    label.append(badge, name);
    return label;
  };
  const groups = dialog.querySelector('.salvage-rule-groups') as HTMLElement;
  groups.append(
    group('Tier', 'tiers', SALVAGE_TIERS.map((tier) => option('checkbox', 'tier', String(tier), `T${tier}`))),
    group('Stars, at most', 'stars', Array.from({ length: SALVAGE_STARS_MAX + 1 }, (_, n) => option('radio', 'stars', String(n), `${n}★`))),
    group('Part (none: any)', 'parts', SALVAGE_PARTS.map((part) => option('checkbox', 'part', part, HERO_PART_NAME[part]))),
    group('Only gear for (none: any class)', 'classes', HERO_CLASSES.map(({ id, name }) => option('checkbox', 'class', id, classLabel(id, name)))),
  );
  const count = dialog.querySelector('.salvage-rule-count') as HTMLElement;
  const auto = dialog.querySelector('.salvage-rule-auto input') as HTMLInputElement;
  const save = dialog.querySelector('[data-rule="save"]') as HTMLButtonElement;
  const pick = dialog.querySelector('[data-rule="pick"]') as HTMLButtonElement;

  const inputs = (name: string): HTMLInputElement[] => [...dialog.querySelectorAll<HTMLInputElement>(`input[name="salvage-${name}"]`)];
  const checked = (name: string): string[] => inputs(name).flatMap((input) => (input.checked ? [input.value] : []));
  /** The rule the choices make. */
  const read = (): SalvageRule => ({
    tiers: checked('tier').map(Number),
    stars: Number(checked('stars')[0] ?? 0),
    parts: checked('part') as SalvageRule['parts'],
    classes: checked('class') as RaidClassId[],
  });
  /** Shows `rule` in the choices. */
  const show = (shown: SalvageRule): void => {
    for (const input of inputs('tier')) input.checked = shown.tiers.includes(Number(input.value));
    for (const input of inputs('stars')) input.checked = Number(input.value) === shown.stars;
    for (const input of inputs('part')) input.checked = (shown.parts as string[]).includes(input.value);
    for (const input of inputs('class')) input.checked = (shown.classes as string[]).includes(input.value);
  };
  /** The rule their drops would be kept to by Save (null: none). */
  const wanted = (): SalvageRule | null => (auto.checked && rule.tiers.length > 0 ? rule : null);
  const kept = (): SalvageRule | null => ctx.view?.autoSalvage ?? null;

  /** How many pieces it picks and what they salvage for; Pick and Save as they can be pressed. */
  function draw(): void {
    const picks = rulePicks(ctx.view?.copies ?? [], rule, ctx.sellLocked);
    const total = picks.reduce((sum, copy) => sum + (copy.salvage ?? 0), 0);
    // (A TechnoMagic piece's: its class's Upgrade Stones, no komaDust.)
    const stones = new Map<string, number>();
    for (const { salvageStones } of picks) if (salvageStones) stones.set(salvageStones.class, (stones.get(salvageStones.class) ?? 0) + salvageStones.count);
    count.textContent = '';
    if (picks.length === 0) count.append(rule.tiers.length === 0 ? 'Pick a tier.' : 'Nothing you have matches.');
    else {
      count.append(`${picks.length} piece${picks.length === 1 ? '' : 's'} match`);
      if (total > 0 || stones.size === 0) count.append(` · ${points(total)} `, dust('coin powder'));
      if (stones.size > 0) count.append(` · ${[...stones].map(([cls, n]) => stoneCount(cls, n)).join(', ')}`);
    }
    pick.textContent = picks.length > 0 ? `Pick ${picks.length}` : 'Pick';
    pick.disabled = picks.length === 0;
    save.disabled = JSON.stringify(wanted()) === JSON.stringify(kept()) || (auto.checked && rule.tiers.length === 0);
  }

  dialog.addEventListener('change', () => {
    rule = read();
    draw();
  });
  dialog.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-rule]');
    // (Its backdrop: the dialog itself, outside its box.)
    if (!button && event.target !== dialog) return;
    dialog.close();
    if (button?.dataset.rule === 'pick') {
      last = rule;
      hooks.pick(rulePicks(ctx.view?.copies ?? [], rule, ctx.sellLocked).map((copy) => copy.id));
    } else if (button?.dataset.rule === 'save') {
      last = rule;
      hooks.save(wanted());
    }
  });

  return {
    open() {
      rule = kept() ?? last ?? FIRST_RULE;
      auto.checked = kept() !== null;
      show(rule);
      draw();
      dialog.showModal();
      // (Its first choice, not the scrolling box of them that the browser would focus.)
      inputs('tier')[0]?.focus();
    },
  };
}

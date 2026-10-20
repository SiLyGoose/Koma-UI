import './gear-sample.css';
import { className } from '../heroes';
import { dragonTierMark, el, itemFace, itemIcons, kindName, rich, tmTier } from '../items/items';
import { itemPicked, popupClosed } from '../items/sfx';
import { closeButton } from '../ui';
import { points } from '../util';
import type { KrOptionData, KrPieceData, KrSetData } from '../../technomagic/sim/gear/kr-data';

/*
 * A sample of a kind of gear a raid's boss drops (./boss-gear.ts: clicking one in its rewards, the databank's or a raid's
 * Raid Info): one piece of it as King's Raid's gear is (../../technomagic/sim/gear/kr-data.ts, read only once one is asked
 * for: it is big), in a popup over the page (./gear-sample.css, its own colours, whatever page it is on): its card, name,
 * part and tier, its main stat from 0★ to 5★, a copy's options rolled at random (rolled again on asking) with all it can roll
 * folded under them, a TechnoMagic piece's unique option, its set's bonuses and its rune sockets. Its card is the armories'
 * (../items/items.css, which the page loads).
 */

/** Which piece a kind's sample is: of a set, a part, and (where its set has several of the part) its kind and class. */
export interface SamplePick {
  set: string;
  part: KrPieceData['part'];
  kind?: string;
  heroClass?: string;
}

type KrData = typeof import('../../technomagic/sim/gear/kr-data');
type Skills = typeof import('../../technomagic/sim/skills');

let data: Promise<[KrData, Skills]> | null = null;
const krData = (): Promise<[KrData, Skills]> => (data ??= Promise.all([import('../../technomagic/sim/gear/kr-data'), import('../../technomagic/sim/skills')]));

/** The TechnoMagic sets (each a raid's), whose pieces have a unique option and a set skill, apart from the dragon sets. */
const TM_SETS = new Set(['perseverance', 'hope', 'authority']);

/** A main stat's name, as the bot's KR_MAIN_NAME. */
const MAIN_NAME: Readonly<Record<string, string>> = { atk: 'ATK', hp: 'HP', defPhysical: 'P. DEF', defMagical: 'M. DEF' };

/**
 * An option's name on a piece, and whether it counts in points (a chance: 0.1 is 100) or as a share, as the bot's HERO_STATS
 * (lib/game/heroes.ts: its `short` and `points`).
 */
const STAT: Readonly<Record<string, { name: string; points: boolean }>> = {
  atk: { name: 'ATK', points: false },
  hp: { name: 'Max HP', points: false },
  crit: { name: 'Crit', points: true },
  critDamage: { name: 'Crit DMG', points: false },
  speed: { name: 'ATK Spd', points: true },
  pen: { name: 'Penetration', points: true },
  acc: { name: 'ACC', points: true },
  defPhysical: { name: 'P. DEF', points: false },
  defMagical: { name: 'M. DEF', points: false },
  blockPhysical: { name: 'P. Block', points: true },
  blockMagical: { name: 'M. Block', points: true },
  dodgePhysical: { name: 'P. Dodge', points: true },
  dodgeMagical: { name: 'M. Dodge', points: true },
  resist: { name: 'CC Resist', points: true },
  accuracy: { name: 'CC ACC', points: true },
  lifesteal: { name: 'Lifesteal', points: true },
  critResist: { name: 'Crit Resist', points: true },
  critResistPhysical: { name: 'P. Crit Resist', points: true },
  critResistMagical: { name: 'M. Crit Resist', points: true },
  recovery: { name: 'Recovery', points: false },
  manaAttack: { name: 'MP Recovery/Attack', points: false },
  manaRegen: { name: 'MP Recovery/Sec', points: false },
  manaDamage: { name: 'MP Recovery/Damage', points: false },
};

/** How much of a stat, as King's Raid's gear says it: "+150" (points), "+14%" (a share). */
const amount = (stat: string, value: number): string => (STAT[stat]?.points ? `+${points(Math.round(value * 1000))}` : `+${Number((value * 100).toFixed(1))}%`);

/** A stat's line, like "Crit +150" (none: a stat the pages don't name). */
const line = (stat: string, value: number): string | null => (STAT[stat] ? `${STAT[stat].name} ${amount(stat, value)}` : null);

/** An option's value at its step: so far between its least and most, in King's Raid's whole thousandths (the bot's optionValue). */
function optionValue(option: KrOptionData, step: number): number {
  const min = Math.round(option.min * 1000);
  const max = Math.round(option.max * 1000);
  return option.steps > 0 ? (min + Math.floor(((max - min) * step) / option.steps)) / 1000 : min / 1000;
}

/** A copy's options, as one drops with them (the bot's rollKrOptions): `count` different stats of its pool's, by their weights, each at a step at random. */
function rollOptions(pool: readonly KrOptionData[], count: number): { option: KrOptionData; step: number }[] {
  const out: { option: KrOptionData; step: number }[] = [];
  const open = [...pool];
  while (out.length < count && open.length > 0) {
    const total = open.reduce((sum, option) => sum + Math.max(1, option.weight), 0);
    let at = Math.random() * total;
    const i = Math.max(0, open.findIndex((option) => (at -= Math.max(1, option.weight)) < 0));
    const [option] = open.splice(i, 1) as [KrOptionData];
    out.push({ option, step: Math.floor(Math.random() * (option.steps + 1)) });
  }
  return out;
}

/** A list, a row each (lines of the bot's markdown). */
function rows(lines: readonly (string | Node)[]): HTMLUListElement {
  const list = el('ul', 'gear-sample-list');
  for (const one of lines) list.appendChild(el('li')).append(typeof one === 'string' ? rich(one) : one);
  return list;
}

/** A part of the sample: its heading, then what's under it. */
function section(label: string, ...body: (string | Node)[]): HTMLElement {
  const box = el('section', 'gear-sample-section');
  box.append(el('h4', 'gear-sample-label', label), ...body.map((one) => (typeof one === 'string' ? rich(one) : one)));
  return box;
}

/** Lines folded away under `summary`. */
function folded(summary: string, lines: readonly string[]): HTMLElement {
  const box = el('details', 'gear-sample-fold');
  box.append(el('summary', '', summary), rows(lines));
  return box;
}

/** A sample copy's options, a line each, with a button rolling them again; then every option it can roll, each with how little and how much, folded away. */
function options(pool: readonly KrOptionData[], count: number): HTMLElement[] {
  const list = el('ul', 'gear-sample-list');
  const roll = (): void => {
    list.replaceChildren(
      ...rollOptions(pool, count).map(({ option, step }) => {
        const row = el('li');
        row.append(line(option.stat, optionValue(option, step)) ?? option.stat);
        if (option.steps > 0) row.append(el('span', 'gear-sample-step', ` (step ${step} of ${option.steps})`));
        return row;
      }),
    );
  };
  roll();
  const again = el('button', 'gear-sample-roll', 'Roll again');
  again.type = 'button';
  again.addEventListener('click', roll);
  const ranges = pool.flatMap((option) => (STAT[option.stat] ? [`**${STAT[option.stat]?.name}** ${amount(option.stat, option.min)} to ${amount(option.stat, option.max)}`] : []));
  return [list, again, folded(`Each copy rolls ${count} of ${pool.length} options, at random, each a different one.`, ranges)];
}

/** A set's bonuses, a line each: a dragon set's 2-piece and 4-piece stats, a TechnoMagic set's 4-piece skill for `heroClass`. */
function setBonuses(set: KrSetData, heroClass: string): string[] {
  const stats = (bonus: object | undefined): string =>
    Object.entries(bonus ?? {})
      .flatMap(([stat, value]) => (typeof value === 'number' ? [line(stat, value) ?? ''] : []))
      .filter(Boolean)
      .join(', ');
  const skill = (set.four as Record<string, unknown>)[heroClass] as { text: string } | undefined;
  if (skill) return [`**4 pieces** (${className(heroClass)}): ${skill.text}`];
  return [...(set.two ? [`**2 pieces**: ${stats(set.two)}`] : []), `**4 pieces**: ${stats(set.four)}`];
}

/** The piece a kind's sample is: of its set, part, kind and class, and (a dragon set's) `tier`. */
const pieceOf = (pieces: readonly KrPieceData[], pick: SamplePick, tier: number): KrPieceData | undefined =>
  pieces.find(
    (piece) =>
      piece.set === pick.set &&
      piece.part === pick.part &&
      (TM_SETS.has(pick.set) || piece.tier === tier) &&
      (pick.kind === undefined || piece.kind === pick.kind) &&
      (pick.heroClass === undefined || (piece.classes as readonly string[]).includes(pick.heroClass)),
  );

/** The popup (made once), its ✕, a click on its backdrop or Esc closing it. */
function popup(): HTMLDialogElement {
  let dialog = document.querySelector<HTMLDialogElement>('dialog.gear-sample');
  if (dialog) return dialog;
  dialog = el('dialog', 'gear-sample');
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog?.close();
  });
  dialog.addEventListener('close', () => popupClosed());
  document.body.append(dialog);
  return dialog;
}

/** Shows a sample of a kind of gear a raid's boss drops (a dragon set's at `tier`, 6 to 8). */
export async function showGearSample(pick: SamplePick, tier: number): Promise<void> {
  const [{ KR_PIECES, KR_POOLS, KR_REFINE, KR_SETS }, { SKILLS }] = await krData();
  const piece = pieceOf(KR_PIECES, pick, tier);
  if (!piece) return;
  const set = KR_SETS[piece.set];
  const tm = TM_SETS.has(piece.set);
  const heroClass = pick.heroClass ?? piece.classes[0] ?? 'knight';
  itemIcons.set(piece.id, piece.icon);
  const dialog = popup();

  const head = el('div', 'gear-sample-head');
  const card = el('span', 'item gear-sample-card');
  card.dataset.stars = '4';
  const slot = piece.part === 'weapon' ? 'weapon' : piece.part === 'armor' || piece.part === 'secondary' ? 'armor' : 'treasure';
  card.append(...itemFace({ level: 0, maxLevel: 5, itemId: piece.id, slot, stars: 4, heroOnly: true, itemClass: tm ? heroClass : null }));
  const title = el('div', 'gear-sample-title');
  // (Who wears it: a weapon or a TechnoMagic piece its class; any other piece those of its weight, or anyone.)
  const who = piece.classes.length >= 7 ? 'Any class' : piece.classes.map(className).join(', ');
  title.append(el('h3', '', piece.name), el('p', 'gear-sample-kind', `${kindName({ slot, part: piece.part })} · ${who}`), tm ? tmTier() : dragonTierMark(piece.tier));
  const close = closeButton();
  close.classList.add('gear-sample-close');
  close.addEventListener('click', () => dialog.close());
  head.append(card, title, close);

  const [stat, base] = piece.main;
  const factors = stat === 'atk' ? KR_REFINE.atk : stat === 'hp' ? KR_REFINE.hp : KR_REFINE.def;
  const top = factors.length - 1;
  const at = (stars: number): string => points(Math.floor((base * (factors[stars] ?? 0)) / 1000));
  const pool = KR_POOLS[piece.pool] ?? [];
  const parts: HTMLElement[] = [section('Main Stat', `**${MAIN_NAME[stat] ?? stat}** ${at(0)} at 0★, ${at(top)} at ${top}★ (awakened with duplicates)`)];
  if (pool.length > 0 && piece.options > 0) parts.push(section('Options', ...options(pool, piece.options)));
  if (piece.unique) parts.push(section('Unique Option', folded(`Each copy comes with one of ${SKILLS.length} additional skills, at random.`, SKILLS.map((skill) => `**${skill.name}** (${skill.tier}): ${skill.about}`))));
  if (set) parts.push(section(`${set.name} Set`, rows(setBonuses(set, heroClass))));
  if (piece.runes > 0) parts.push(section('Runes', `${piece.runes} rune socket${piece.runes === 1 ? '' : 's'}`));

  const what = tm
    ? `A sample of the ${set?.name ?? piece.set} set's pieces: each class has its own.`
    : `A sample of the ${set?.name ?? piece.set} set's T${piece.tier} pieces, the tier the stage picked drops: every class's weapon, light, medium and heavy armor and mantles, and four accessories.`;
  const panel = el('div', 'gear-sample-panel');
  panel.append(head, el('p', 'gear-sample-about', what), ...parts);
  dialog.setAttribute('aria-label', piece.name);
  dialog.replaceChildren(panel);
  itemPicked(null, piece.id);
  dialog.showModal();
}

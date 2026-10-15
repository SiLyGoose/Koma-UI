import type { ShownStatSection } from '../shared/items';
import { className, type HeroView, type HeroStat } from '../shared/heroes';
import { POINTS } from '../technomagic/sim/combat/damage';
import { geared } from '../technomagic/sim/gear';
import { CRIT, MANA_PER_ATTACK, MANA_RATE } from '../technomagic/sim/rules';
import { HEROES } from '../technomagic/sim/heroes';
import { CLASS_STATS, lineOf, type HeroClass } from '../technomagic/sim/heroes/kit';
import type { Line } from '../technomagic/sim/rules';

/*
 * The heroes page's Stats tab: a hero's class, the kind of damage it deals and where it stands in the fight (the raid's
 * ../technomagic/sim/heroes/: its own, or its class's), then its stats in the TechnoMagic Raid, as its class has them (the raid's
 * sim/heroes/kit.ts CLASS_STATS), and with what its gear gives it (the bot's bonus, as the raid's sim/gear.ts
 * counts it: points added to the chances and shares, a share more of the rest). Each row its gear changes
 * says what it is without it.
 */

const pct = (points: number): string => `${Math.round((points / POINTS) * 1000) / 10}%`;
const whole = (n: number): string => Math.round(n).toLocaleString('en-US');
const times = (n: number): string => `${Math.round(n * 100)}%`;

/** A row: its value with the gear, and (when the gear changes it) without. */
function row(label: string, base: number, withGear: number, show: (n: number) => string): ShownStatSection['rows'][number] {
  const changed = Math.abs(withGear - base) > 1e-9;
  return { label, value: show(withGear), base: changed ? show(base) : null };
}

/** Where a hero stands, as King's Raid says it. */
const POSITION: Record<Line, string> = { front: 'Front', middle: 'Middle', back: 'Rear' };

/** A hero's stats; with no `bonus` (the databank's Heroes), as its class has them, gear or no. */
export function heroStats(hero: Pick<HeroView, 'class'> & Partial<Pick<HeroView, 'bonus' | 'id'>>): ShownStatSection[] {
  // First what it is rather than what its gear does: its class (as the gear page's Stats have it), and, for a hero the
  // raid knows, the kind of damage it deals and where it stands.
  const def = HEROES.find((one) => one.id === hero.id);
  const about: ShownStatSection = {
    title: 'Hero',
    rows: [
      { label: 'Class', value: className(hero.class), base: null },
      ...(def
        ? [
            // (With King's Raid's icon before it, an orange sword or a blue star in a red box: public/shared/attack/, named as the raid's DamageType.)
            { label: 'ATK type', value: def.stats.deals === 'physical' ? 'Physical' : 'Magic', icon: `/shared/attack/${def.stats.deals}.png`, base: null },
            { label: 'Position', value: POSITION[lineOf(def)], base: null },
          ]
        : []),
    ],
  };
  const base = CLASS_STATS[hero.class as HeroClass];
  if (!base) return [about];
  const bonus = (stat: HeroStat): number => hero.bonus?.[stat] ?? 0;
  const gear = geared({ ...base, deals: 'physical' }, hero.bonus ?? {});
  return [
    about,
    {
      title: 'Battle',
      rows: [
        row('HP', base.hp, gear.hp, whole),
        row('ATK', base.atk, gear.atk, whole),
        row('Crit chance', base.crit, gear.crit, pct),
        row('Crit damage', CRIT, CRIT + bonus('critDamage'), times),
        row('Attack speed', base.speed, gear.speed, pct),
        row('Penetration', base.pen, gear.pen, pct),
        row('Accuracy', 0, bonus('accuracy'), pct),
        row('Lifesteal', 0, bonus('lifesteal'), pct),
      ],
    },
    {
      title: 'Defense',
      rows: [
        row('Physical defense', base.physical, gear.physical, whole),
        row('Magical defense', base.magical, gear.magical, whole),
        row('Physical block', base.block.physical, gear.block.physical, pct),
        row('Magical block', base.block.magical, gear.block.magical, pct),
        row('Physical dodge', base.dodge.physical, gear.dodge.physical, pct),
        row('Magical dodge', base.dodge.magical, gear.dodge.magical, pct),
        row('CC resistance', base.resist, gear.resist, pct),
        row('Physical crit resistance', 0, bonus('critResist'), pct),
        row('Magical crit resistance', 0, bonus('critResist'), pct),
      ],
    },
    {
      title: 'Support',
      rows: [row('Heals and shields', 1, 1 + bonus('heal'), times), row('Stun duration', 1, 1 + bonus('control'), times)],
    },
    {
      title: 'Mana',
      rows: [
        row('Mana per attack', MANA_PER_ATTACK, MANA_PER_ATTACK * (1 + bonus('manaAttack')), whole),
        row('Mana recovery per second', MANA_RATE, MANA_RATE * (1 + bonus('manaRegen')), whole),
      ],
    },
  ];
}

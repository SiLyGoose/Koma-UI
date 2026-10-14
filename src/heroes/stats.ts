import type { StatSection } from '../shared/items';
import { className, type Hero, type HeroStat } from '../shared/heroes';
import { POINTS } from '../technomagic/combat/damage';
import { geared } from '../technomagic/sim/gear';
import { CRIT, MANA_PER_ATTACK, MANA_RATE } from '../technomagic/sim/rules';
import { CLASS_STATS, type HeroClass } from '../technomagic/heroes/kit';

/*
 * The heroes page's Stats tab: a hero's class, then its stats in the TechnoMagic Raid, as its class has them (the raid's
 * heroes/kit.ts CLASS_STATS), and with what its gear gives it (the bot's bonus, as the raid's sim/gear.ts
 * counts it: points added to the chances and shares, a share more of the rest). Each row its gear changes
 * says what it is without it.
 */

const pct = (points: number): string => `${Math.round((points / POINTS) * 1000) / 10}%`;
const whole = (n: number): string => Math.round(n).toLocaleString('en-US');
const times = (n: number): string => `${Math.round(n * 100)}%`;

/** A row: its value with the gear, and (when the gear changes it) without. */
function row(label: string, base: number, withGear: number, show: (n: number) => string): StatSection['rows'][number] {
  const changed = Math.abs(withGear - base) > 1e-9;
  return { label, value: show(withGear), base: changed ? show(base) : null };
}

export function heroStats(hero: Hero): StatSection[] {
  // First what it is rather than what its gear does: its class (as the gear page's Stats have it).
  const about: StatSection = { title: 'Hero', rows: [{ label: 'Class', value: className(hero.class), base: null }] };
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
        row('CC resist', base.resist, gear.resist, pct),
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

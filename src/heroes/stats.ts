import type { ShownStatSection } from '../shared/items';
import { className, type HeroView, type HeroStat } from '../shared/heroes';
import { POINTS } from '../technomagic/sim/combat/damage';
import { geared } from '../technomagic/sim/gear';
import { ownAuras, perkedStats, perksOf, withPerks } from '../technomagic/sim/perks';
import { CRIT, MANA_PER_ATTACK, MANA_RATE } from '../technomagic/sim/rules';
import { SKILL, skilledCritDamage, skilledStats, skillsOf, type SkillId } from '../technomagic/sim/skills';
import { HEROES } from '../technomagic/sim/heroes';
import { CLASS_STATS, lineOf, type HeroClass } from '../technomagic/sim/heroes/kit';
import type { Line } from '../technomagic/sim/rules';

/*
 * The heroes page's Stats tab: a hero's class, the kind of damage it deals and where it stands in the fight (the raid's
 * ../technomagic/sim/heroes/: its own, or its class's), then its stats in the TechnoMagic Raid, as its class has them (the raid's
 * sim/heroes/kit.ts CLASS_STATS), and with what its gear, the additional effects of the TechnoMagic gear it wears and its
 * transcendence perks give it (the bot's bonus and skills, and the raid's sim/skills.ts and sim/perks.ts, as the raid's
 * sim/gear.ts counts it: points added to the chances and shares, a share more of the rest). Each row they change says
 * what it is without them. Each stat's name is spelled out (the user's).
 */

const pct = (points: number): string => `${Math.round((points / POINTS) * 1000) / 10}%`;
const whole = (n: number): string => Math.round(n).toLocaleString('en-US');
const times = (n: number): string => `${Math.round(n * 100)}%`;

/** A row: its value with the gear, and (when the gear changes it) without, and what it adds (or takes). */
function row(label: string, base: number, withGear: number, show: (n: number) => string): ShownStatSection['rows'][number] {
  const changed = Math.abs(withGear - base) > 1e-9;
  if (!changed) return { label, value: show(withGear), base: null };
  const added = withGear - base;
  return { label, value: show(withGear), base: show(base), added: `${added < 0 ? '−' : '+'} ${show(Math.abs(added))}` };
}

/** Where a hero stands, as King's Raid says it. */
const POSITION: Record<Line, string> = { front: 'Front', middle: 'Middle', back: 'Rear' };

/** A hero's stats; with no `bonus` (the databank's Heroes), as its class has them, gear or no. */
export function heroStats(hero: Pick<HeroView, 'class'> & Partial<Pick<HeroView, 'bonus' | 'id' | 'perks' | 'skills'>>): ShownStatSection[] {
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
            { label: 'Attack Type', value: def.stats.deals === 'physical' ? 'Physical' : 'Magic', icon: `/shared/attack/${def.stats.deals}.png`, base: null },
            { label: 'Position', value: POSITION[lineOf(def)], base: null },
          ]
        : []),
    ],
  };
  // (A hero the raid knows stands as its own stats have it, its class's with what is its own over them.)
  const base = def?.stats ?? CLASS_STATS[hero.class as HeroClass];
  if (!base) return [about];
  // (Its perks, picked as far as it is transcended, add to its stats as its gear does; and what they give every ally, itself
  // among them, as the fight has it: Battle Cry's max HP with its gear's, the rest beside its own.)
  const perks = def ? [...perksOf(hero.perks, def).values()] : [];
  const auras = ownAuras(perks);
  const given = withPerks(hero.bonus ?? {}, perks);
  if (auras.hp) given.hp = (given.hp ?? 0) + auras.hp;
  const bonus = (stat: HeroStat): number => given[stat] ?? 0;
  // (Its additional effects: on its own stats, as the fight has them from the start; and what it gives every ally, itself
  // among them, and Mana Spring's mana, as much a second as it gives every few.)
  const skills = skillsOf(hero.skills);
  const n = (id: SkillId): number => skills[id] ?? 0;
  const gear = skilledStats(perkedStats(geared({ ...base, deals: 'physical' }, given), perks), skills);
  const allies = {
    atk: 1 + SKILL['war-cry'].atk * n('war-cry') + (auras.atk ?? 0),
    crit: auras.crit ?? 0,
    critDamage: SKILL.whetstone.critDamage * n('whetstone') + (auras.critDamage ?? 0),
    speed: auras.speed ?? 0,
    accuracy: auras.accuracy ?? 0,
    resist: auras.resist ?? 0,
    defense: 1 + SKILL.bastion.defense * n('bastion'),
  };
  const spring = (SKILL['mana-spring'].mana / SKILL['mana-spring'].every) * n('mana-spring');
  return [
    about,
    {
      title: 'Battle',
      rows: [
        row('Health', base.hp, gear.hp, whole),
        row('Attack', base.atk, gear.atk * allies.atk, whole),
        row('Critical Chance', base.crit, gear.crit + allies.crit, pct),
        row('Critical Damage', CRIT + base.critDamage, CRIT + base.critDamage + bonus('critDamage') + skilledCritDamage(skills) + allies.critDamage, times),
        row('Attack Speed', base.speed, gear.speed + allies.speed, pct),
        row('Penetration', base.pen, gear.pen, pct),
        row('Hit Accuracy', base.acc, gear.acc + perks.reduce((sum, perk) => sum + (perk.acc ?? 0), 0), pct),
        row('Accuracy', 0, bonus('accuracy') + allies.accuracy, pct),
        row('Lifesteal', 0, bonus('lifesteal'), pct),
      ],
    },
    {
      title: 'Defense',
      rows: [
        row('Physical Defense', base.physical, gear.physical * allies.defense, whole),
        row('Magical Defense', base.magical, gear.magical * allies.defense, whole),
        row('Physical Block', base.block.physical, gear.block.physical, pct),
        row('Magical Block', base.block.magical, gear.block.magical, pct),
        row('Physical Block Defense', base.blockDef?.physical ?? 0, gear.blockDef?.physical ?? 0, times),
        row('Magical Block Defense', base.blockDef?.magical ?? 0, gear.blockDef?.magical ?? 0, times),
        row('Physical Dodge', base.dodge.physical, gear.dodge.physical, pct),
        row('Magical Dodge', base.dodge.magical, gear.dodge.magical, pct),
        row('Crowd Control Resistance', base.resist, gear.resist + allies.resist, pct),
        row('Physical Tough', base.tough?.physical ?? 0, gear.tough?.physical ?? 0, pct),
        row('Magical Tough', base.tough?.magical ?? 0, gear.tough?.magical ?? 0, pct),
        row('Physical Critical Resistance', 0, bonus('critResist'), pct),
        row('Magical Critical Resistance', 0, bonus('critResist'), pct),
      ],
    },
    {
      title: 'Support',
      rows: [row('Heals and Shields', 1, 1 + bonus('heal'), times), row('Stun Duration', 1, 1 + bonus('control'), times)],
    },
    {
      title: 'Mana',
      rows: [
        row('Mana per Attack', MANA_PER_ATTACK, MANA_PER_ATTACK * (1 + bonus('manaAttack')), whole),
        row('Mana Recovery per Second', MANA_RATE, MANA_RATE * (1 + bonus('manaRegen')) + spring, whole),
      ],
    },
  ];
}

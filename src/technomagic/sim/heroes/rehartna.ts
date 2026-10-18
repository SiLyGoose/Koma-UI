import { away, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, NEW_ROAD, NEW_ROAD_UP } from '../unique';
import { bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, type Passive, played, playedHeal } from './kit';

/*
 * Rehartna's skills, as King's Raid's playtest has them (stats/rehartna.md: how hard each hits and heals at its level 90,
 * and every number here, are its; its words are its own). She is a priest whose blows are physical, the Kindhearted Messenger.
 * - Release! Ultrasonic Wave!: four blows, each stunning the boss and leaving it hitting less hard for a while.
 * - Crystal Clear, Matimaruma!: the ally with the lowest HP healed, and a shield on it for a while (immune to CC); while it
 *   holds, every second its allies healed and their DEF higher a moment, and the boss struck and slowed a moment.
 * - You've Never Seen a Weapon Like This!: 4 random allies' cooldowns shorter, and for a while their mana fills every second
 *   and their ATK is higher (its books' half again; the more after its first use).
 * Her passive, Battle March Melody: as each battle begins (each wave of a raid's), every ally healed, and healing reaches
 * them more (up to 3 times).
 * Her unique weapon (../unique.ts) is worked here too: every 3 skills she uses, what the boss left on every ally is cleared,
 * and they take less for a while.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/rehartna.ts).
 *
 * Her own perks (../perks.ts) are King's Raid's. Ultrasonic Wave's Light (what helps the boss gone) and Classified
 * Resistance Document's mana off the boss do nothing here.
 */
/** Ultrasonic Wave: each of its four blows, how long each stuns; the boss's ATK less, for how long. */
const WAVE = { blow: played('priest', 972, 39_054), stun: 3, weaker: 0.75, lasts: 10 };
/** Crystal Clear: its heal and its shield, for how long; while it holds, every second: its heal and blow, and the DEF more (flat) and the boss's attack speed less (points) for a moment. */
const CRYSTAL = { heal: playedHeal('priest', 4544, 182_836), shield: playedHeal('priest', 8472, 326_618), lasts: 10, each: playedHeal('priest', 1122, 49_784), blow: played('priest', 1122, 49_784), defense: 23_606, slow: 250 };
/** You've Never Seen a Weapon Like This!: how many allies, the seconds off their cooldowns; for how long, their mana every second and ATK more (flat, its books' half again; and more after its first use). */
const WEAPON = { allies: 4, sooner: 4, lasts: 15, mana: 150, atk: 85_840, books: 1.5, more: 0.15 };
/** Battle March Melody: its heal; each stack's healing more, up to how many. */
const MARCH = { heal: playedHeal('priest', 2574, 116_310), heals: 0.1, most: 3 };
/** Her own perks' numbers: Ultrasonic's Dark's penetration less on the boss; Crystal's Dark's more physical damage taken; Weapon's Light's allies and Dark's shorter cooldown; March's Light's mana and Dark's crit DMG for each stack; Transcend 5's Dark's ATK and DEF for each, up to how many, on how many allies. */
const PERKS = { pen: 250, penLasts: 10, takes: 1.25, allies: 6, mana: 1000, critDamage: 0.12, dark: { share: 0.03, most: 10, allies: 4 } };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Crystal Clear's Crit Resistance and mana for
 * its allies; Weapon's more seconds off every cooldown, and immunity to CC; March's most stacks, and each's more to bosses.
 */
const UT = {
  document: {},
  generator: { critResist: [100, 120, 140, 170, 210, 250], mana: 150 },
  medley: { sooner: [1, 1.2, 1.4, 1.7, 2.1, 2.5], immune: 5 },
  dragon: { most: 6, boss: [0.03, 0.036, 0.043, 0.052, 0.062, 0.075] },
};

const art = skillArt('rehartna');

const MARCH_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Battle March Melody', about: `Passive. As each battle begins, every ally healed, and healing reaches them ${pct(MARCH.heals)} more (up to ${MARCH.most} times).`, icon: '🎵', art: art(3) },
  words: `At the beginning of each battle, heals HP of all allies by ${healed('priest', MARCH.heal, bookHeal('rehartna', 3))}, and increases Heal Rate by ${pct(MARCH.heals)}. Heal Rate Boost effect can be stacked up to max ${MARCH.most} times, and is irremovable.`,
};
const CRYSTALLINE: Buff = { name: 'Crystal Clear, Matimaruma!', about: 'Shielded and immune to CC; its allies healed every second.', icon: '💎', art: art(1) };
const STEADIED: Buff = { name: 'Matimaruma’s Chime', about: 'DEF higher.', icon: '💎', art: art(1) };
const ARMED: Buff = { name: 'You’ve Never Seen a Weapon Like This!', about: 'Mana every second, and ATK higher.', icon: '🎸', art: art(2) };
const MARCHING: Buff = { name: 'Battle March Melody', about: 'Healing reaches it more for each.', icon: '🎵', art: art(3) };
const CHEERED: Buff = { name: 'Kindhearted Messenger', about: 'ATK and DEF higher for each.', icon: '🎵', art: art(3) };

export const REHARTNA: HeroDef = {
  id: 'rehartna',
  name: 'Rehartna',
  class: 'priest',
  skins: ['Rehartna'],
  stats: { ...CLASS_STATS.priest, deals: 'physical' },
  abilities: [
    {
      name: 'Release! Ultrasonic Wave!',
      about: `Four blows, each stunning the boss for ${WAVE.stun} seconds and leaving it hitting ${pct(1 - WAVE.weaker)} less hard for ${WAVE.lasts}.`,
      words: `Attacks frontal enemies in a straight line, dealing a total of ${dmg('priest', WAVE.blow * 4, bookDmg('rehartna', 0))} P.DMG over 4 times. Each hit inflicts stun for ${WAVE.stun} sec, and reduces enemies' ATK by ${pct(1 - WAVE.weaker)} for ${WAVE.lasts} sec.`,
      icon: '📢',
      art: art(0),
      move: 'ultrasonic',
      cooldown: 13,
      cost: 2,
    },
    {
      name: 'Crystal Clear, Matimaruma!',
      auto: { heals: true },
      about: `The ally with the lowest HP healed, and a shield on it for ${CRYSTAL.lasts} seconds (immune to CC); while it holds, every second its allies healed and their DEF higher, the boss struck and slowed.`,
      words: `Immediately heals HP of the ally with the lowest HP by ${healed('priest', CRYSTAL.heal, bookHeal('rehartna', 1))}, creating a shield that absorbs ${healed('priest', CRYSTAL.shield, bookHeal('rehartna', 1))} DMG and grants immunity to CC for ${CRYSTAL.lasts} sec. While the shield is active, heals HP of all allies near the target by ${healed('priest', CRYSTAL.each, bookHeal('rehartna', 1))} every sec, and increases All DEF by ${num(CRYSTAL.defense)}. Enemies take ${dmg('priest', CRYSTAL.blow, bookDmg('rehartna', 1))} DMG and have their ATK Spd reduced by ${CRYSTAL.slow}.`,
      icon: '💎',
      art: art(1),
      move: 'crystal',
      cooldown: 17,
      cost: 2,
    },
    {
      name: 'You’ve Never Seen a Weapon Like This!',
      about: `${WEAPON.allies} random allies: ${WEAPON.sooner} seconds off their cooldowns, and for ${WEAPON.lasts} seconds ${WEAPON.mana} mana every second and ATK +${num(Math.round(WEAPON.atk * WEAPON.books))}.`,
      words: `Reduces ${WEAPON.allies} random allies' Cooldown of all active Skills by ${WEAPON.sooner} sec. For ${WEAPON.lasts} sec, recovers allies' Mana by ${WEAPON.mana} every sec and increases ATK by ${num(Math.round(WEAPON.atk * WEAPON.books))}. Upon every use, ATK Boost effect is increased by an additional ${pct(WEAPON.more)}.`,
      icon: '🎸',
      art: art(2),
      move: 'instrument',
      cooldown: 25,
      cost: 3,
    },
  ],
  passive: MARCH_SHOWN,
  treasures: [
    treasure('Classified Resistance Document', () => ({
      words: "[Release! Ultrasonic Wave!] Rehartna becomes immune to CC while in use. Each hit reduces enemy's Mana by 360",
      skill: { index: 0, steady: true },
    })),
    treasure('Ultrasound Wave Generator', (k) => ({
      words: `[Crystal Clear, Matimaruma!] Increases Crit Resistance of allies within range by ${k(UT.generator.critResist)} and recovers their Mana by ${UT.generator.mana} every sec.`,
    })),
    treasure('Medley Sheet', (k) => ({
      words: `[You've Never Seen a Weapon Like This!] Reduces Cooldown of all Skills by an additional ${k(UT.medley.sooner)} sec, and grants immunity to CC to the target for ${UT.medley.immune} sec.`,
    })),
    treasure('Dragon Drawing', (k) => ({
      words: `[Battle March Melody] Max number of stacks increases to ${UT.dragon.most} times and each stack increases DMG dealt to Bosses by ${pct(k(UT.dragon.boss))}`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, cost: 1 } }, ({ skill }) => `Increases Mana Cost by ${skill.cost} and dispels positive effects from the target.`),
    's1-dark': { words: `Reduces DEF Penetration of the hit target by ${PERKS.pen} for ${PERKS.penLasts} sec.` },
    's2-light': said({ skill: { index: 1, cost: -1 } }, ({ skill }) => `Reduces Mana Cost by ${-skill.cost}.`),
    's2-dark': { words: `For the duration of Skill, enemies within range take ${pct(PERKS.takes - 1)} increased P.DMG.` },
    's3-light': { words: `The effect applies to ${PERKS.allies} allies.` },
    's3-dark': said({ skill: { index: 2, cooldown: -7 } }, ({ skill }) => `Reduces Cooldown by ${-skill.cooldown} sec.`),
    's4-light': { words: `At the beginning of each battle, recovers own Mana by ${PERKS.mana}.` },
    's4-dark': { words: `Each stack increases Crit DMG of all allies by ${pct(PERKS.critDamage)}.` },
    't5-light': t5Light({ resist: 100 }, ({ resist }) => `CC Resist +${resist}`),
    't5-dark': { words: `Upon every Skill use, increases ${PERKS.dark.allies} random allies' ATK by ${pct(PERKS.dark.share)} and All DEF by ${pct(PERKS.dark.share)}. This effect can be stacked up to max ${PERKS.dark.most} times, and is irremovable.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** Crystal Clear's ally, how long its shield has yet, and toward its next second; Weapon's allies, how long yet, toward its next second, and whether it has been used; March's stacks, and the wave it last began; her unique weapon's skills; Transcend 5's Dark's stacks, by ally. */
    let crystal: Fighter | null = null;
    let crystalLeft = 0;
    let crystalTick = 0;
    let armed: Fighter[] = [];
    let armedLeft = 0;
    let armedTick = 0;
    let usedOnce = false;
    let marched = 0;
    let wave = 0;
    let road = 0;
    const cheered = new Map<Fighter, number>();
    const most = wearsTreasure(self, 3) ? UT.dragon.most : MARCH.most;
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** `count` of her allies, at random. */
    const random = (count: number): Fighter[] => {
      const left = allies();
      const out: Fighter[] = [];
      while (out.length < count && left.length > 0) out.push(left.splice(Math.floor(fight.roll() * left.length), 1)[0] as Fighter);
      return out;
    };

    return {
      lands: {
        attack() {
          fight.hit(self, fight.basic);
        },
        // Four blows, each stunning the boss and leaving it hitting less hard (its Dark: its penetration lower).
        ultrasonic() {
          fight.hit(self, WAVE.blow);
          fight.stun(WAVE.stun, { by: self });
          put(fight.foe.statuses, { name: 'Ultrasonic Wave', left: WAVE.lasts, deals: WAVE.weaker, ...(self.perks.has('s1-dark') && { pen: -PERKS.pen }), shown: 'curse' });
        },
        // The ally with the lowest HP healed and shielded (immune to CC meanwhile: tick).
        crystal() {
          const ally = allies().sort((a, b) => a.hp / a.stats.hp - b.hp / b.stats.hp)[0];
          if (!ally) return;
          fight.cue(self, 'crystal', [ally]);
          fight.heal(ally, CRYSTAL.heal, self);
          fight.shield(ally, CRYSTAL.shield, CRYSTAL.lasts, self);
          crystal = ally;
          crystalLeft = CRYSTAL.lasts;
          crystalTick = 0;
        },
        // Random allies (its Light: 6): cooldowns shorter (Medley Sheet: more, and immune to CC a while), then mana every second and ATK higher (tick).
        instrument() {
          const on = random(self.perks.has('s3-light') ? PERKS.allies : WEAPON.allies);
          fight.cue(self, 'instrument', on);
          const sooner = WEAPON.sooner + fromTreasure(self, 2, UT.medley.sooner);
          const atk = WEAPON.atk * (WEAPON.books + (usedOnce ? WEAPON.more : 0));
          usedOnce = true;
          for (const ally of on) {
            ally.cooldowns = ally.cooldowns.map((left) => Math.max(0, left - sooner));
            put(ally.statuses, { name: ARMED.name, left: WEAPON.lasts, atk: atk / ally.stats.atk, shown: ARMED });
            if (wearsTreasure(self, 2)) put(ally.statuses, { name: 'Medley Sheet', left: UT.medley.immune, guards: true, shown: ARMED });
          }
          armed = on;
          armedLeft = WEAPON.lasts;
          armedTick = 0;
        },
      },
      used() {
        // Her unique weapon: every 3rd skill, what the boss left on every ally cleared, and they take less for a while.
        if (tier !== null && ++road >= NEW_ROAD.skills) {
          road = 0;
          for (const ally of allies()) ally.statuses = ally.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
          put(fight.party, { name: NEW_ROAD_UP.name, left: NEW_ROAD.lasts, takes: 1 - atTier(NEW_ROAD.taken, tier), shown: NEW_ROAD_UP });
        }
        // Transcend 5's Dark: random allies' ATK and DEF higher, for good (up to its most).
        if (self.perks.has('t5-dark'))
          for (const ally of random(PERKS.dark.allies)) {
            const count = Math.min(PERKS.dark.most, (cheered.get(ally) ?? 0) + 1);
            cheered.set(ally, count);
            put(ally.statuses, { name: CHEERED.name, left: Infinity, count, atk: PERKS.dark.share * count, defends: 1 + PERKS.dark.share * count, shown: CHEERED });
          }
      },
      tick(dt) {
        // Battle March Melody: as each battle begins, every ally healed, and their healing higher (its Light: her mana; its Dark: their crit DMG; Dragon Drawing: more to bosses).
        if (fight.wave !== wave && fight.field.includes(self) && self.hp > 0) {
          wave = fight.wave;
          marched = Math.min(most, marched + 1);
          const on = allies();
          fight.cue(self, 'march', on);
          for (const ally of on) {
            fight.heal(ally, MARCH.heal, self);
            put(ally.statuses, {
              name: MARCHING.name,
              left: Infinity,
              count: marched,
              heals: 1 + MARCH.heals * marched,
              ...(self.perks.has('s4-dark') && { critDamage: PERKS.critDamage * marched }),
              ...(wearsTreasure(self, 3) && { deals: 1 + fromTreasure(self, 3, UT.dragon.boss) * marched }),
              shown: MARCHING,
            });
          }
          if (self.perks.has('s4-light')) self.mana = Math.min(MAX_MANA, self.mana + PERKS.mana);
        }
        // Crystal Clear: while its shield holds, its ally immune to CC; every second its allies healed and their DEF higher a moment, the boss struck and slowed (its Dark: taking more; Ultrasound Wave Generator: Crit Resistance and mana).
        if (crystal) {
          crystalLeft -= dt;
          if (crystalLeft <= 0 || crystal.shield <= 0 || crystal.hp <= 0) {
            crystal.statuses = crystal.statuses.filter((status) => status.name !== CRYSTALLINE.name);
            crystal = null;
          } else {
            put(crystal.statuses, { name: CRYSTALLINE.name, left: crystalLeft, guards: true, shown: CRYSTALLINE });
            crystalTick += dt;
            if (crystalTick >= 1) {
              crystalTick -= 1;
              for (const ally of allies()) {
                fight.heal(ally, CRYSTAL.each, self);
                put(ally.statuses, { name: STEADIED.name, left: 1, bolsters: { physical: CRYSTAL.defense, magical: CRYSTAL.defense }, ...(wearsTreasure(self, 1) && { critResist: fromTreasure(self, 1, UT.generator.critResist) }), shown: STEADIED });
                if (wearsTreasure(self, 1)) ally.mana = Math.min(MAX_MANA, ally.mana + UT.generator.mana);
              }
              fight.hit(self, CRYSTAL.blow);
              fight.slow(CRYSTAL.slow, 1);
              if (self.perks.has('s2-dark')) put(fight.foe.statuses, { name: 'Crystal Clear', left: 1, takes: { physical: PERKS.takes }, shown: 'curse' });
            }
          }
        }
        // Weapon: its allies' mana every second, for its while.
        if (armedLeft > 0) {
          armedLeft -= dt;
          armedTick += dt;
          if (armedTick >= 1) {
            armedTick -= 1;
            for (const ally of armed) if (ally.hp > 0) ally.mana = Math.min(MAX_MANA, ally.mana + WEAPON.mana);
          }
        }
      },
      lit: () => crystal !== null || armedLeft > 0,
    };
  },
};

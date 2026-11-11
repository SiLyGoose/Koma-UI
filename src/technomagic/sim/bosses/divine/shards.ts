import { put } from '../../combat/status';
import { MAX_MANA } from '../../rules';
import { stateArt, type Buff } from '../../shown';
import type { Fight } from '../../types';
import type { BossDef, BossPart } from '../boss';

/*
 * Full Shards brought into a Divine Punishment boss dungeon (King's Raid's ShardFlaskManager; ShardItemTable's affixes:
 * KR-extracted/briefs/divine-punishment.md §4.3, gen/skills-shards.md). One tier of the group's, so many of them: its affixes
 * are extra skills at the level of how many, for its Duration times as many seconds from the fight's start. Its heroes' buff in
 * every boss dungeon of the group; its boss debuff only on the group's final boss (CreatureIndex 60001 and 60002: Tersio and
 * Apocalypsion; 60009: Solenis), from the start of whichever of them is on the field for what is left of the time.
 * What each does here, by tier:
 * - Apocalypsion's (heroes): ACC +100, +150, +250, +300, +400; from T3 the heroes' CC on the boss lasting 10%, 20%, 30% longer
 *   (ModCcTimeR: their stuns' seconds); from T4 DMG 15%, 30% higher (ModAttackPower); T5 crit chance +400. (Boss): max HP 10%,
 *   20%, 30%, 40% lower (OverrideCalcMaxHpR, from T2: its health with it, its share of it kept as it ends); from T3 20%, 30%,
 *   40% more DMG taken (ModWeakness); from T4 15%, 30% less DMG dealt; T5 40% less crit chance.
 * - Solenis' (heroes): healing received 10%, 15%, 20%, 25%, 30% higher (ModRecoverPower); from T3 every 10 seconds each skill's
 *   cooldown 2%, 5%, 10% of it shorter (ModActiveCooltimeR, InCoolTime), from T4 with 1,000, 2,000 mana; T5 CC 30% longer.
 *   (Boss): max HP 10% to 40% lower; from T3 crit resistance 200, 300, 400 lower (ModCriticalDodgeChance); T5 30% less DMG
 *   dealt. Its Mana Recovery cut (T4, T5: OverrideStatFirst MpRegenRatioM) has nothing to cut here (the stand-in Solenis has no
 *   mana), and its T4 SetSkill of Bouncing Boomerang (1440: a hero's own skill, set on the boss) is left out.
 * The values are the same at any level (the ops' have no level scaling); only the time grows with the count.
 */

export type ShardGroup = 'apocalypsion' | 'solenis';
/** Full Shards brought: whose, which tier, how many. */
export interface ShardUse {
  group: ShardGroup;
  tier: 1 | 2 | 3 | 4 | 5;
  count: number;
}

/** Each tier's Duration (seconds, ShardItemTable: both groups alike). */
const DURATION = [30, 60, 100, 180, 240] as const;

interface HeroBuff {
  acc?: number;
  dmg?: number;
  control?: number;
  crit?: number;
  heal?: number;
  cooldown?: number;
  mana?: number;
}
interface BossDebuff {
  hp?: number;
  taken?: number;
  deals?: number;
  crit?: number;
  critResist?: number;
}
const HEROES: Readonly<Record<ShardGroup, readonly HeroBuff[]>> = {
  apocalypsion: [{ acc: 100 }, { acc: 150 }, { acc: 250, control: 0.1 }, { acc: 300, dmg: 0.15, control: 0.2 }, { acc: 400, control: 0.3, dmg: 0.3, crit: 400 }],
  solenis: [{ heal: 0.1 }, { heal: 0.15 }, { heal: 0.2, cooldown: 0.02 }, { heal: 0.25, cooldown: 0.05, mana: 1000 }, { heal: 0.3, cooldown: 0.1, mana: 2000, control: 0.3 }],
};
const BOSSES: Readonly<Record<ShardGroup, readonly BossDebuff[]>> = {
  apocalypsion: [{}, { hp: 0.1 }, { hp: 0.2, taken: 0.2 }, { hp: 0.3, taken: 0.3, deals: 0.15 }, { hp: 0.4, taken: 0.4, deals: 0.3, crit: 400 }],
  solenis: [{}, { hp: 0.1 }, { hp: 0.2, critResist: 200 }, { hp: 0.3, critResist: 300 }, { hp: 0.4, critResist: 400, deals: 0.3 }],
};

const SHARD: Buff = { name: 'Full Shard', about: "A Full Shard's power.", icon: '💠', art: stateArt('AttackUp') };
const COOLDOWN_EVERY = 10;

/**
 * A boss dungeon's boss with Full Shards brought (`use`: none, as it is): the heroes' buff put on as the fight begins, and (`final`:
 * the group's final boss) the boss's debuff; a boss after it in the same fight (Apocalypsion after Tersio) has the debuff too,
 * for what is left of its time.
 */
export function withShards(def: BossDef, use: ShardUse | null, final: boolean, heroes = true): BossDef {
  if (!use || use.count <= 0) return def;
  const tier = use.tier - 1;
  const lasts = (DURATION[tier] as number) * use.count;
  const buff = HEROES[use.group][tier] ?? {};
  const debuff = final ? (BOSSES[use.group][tier] ?? {}) : {};
  const join = def.join;
  return {
    ...def,
    ...(def.next && { next: { ...def.next, def: withShards(def.next.def, use, final, false) } }),
    join(fight: Fight): BossPart {
      const part = join?.(fight) ?? { lands: {} };
      const { foe } = fight;
      const left = lasts - fight.elapsed;
      if (heroes)
        put(fight.party, {
          name: SHARD.name,
          left: lasts,
          ...(buff.acc && { acc: buff.acc }),
          ...(buff.dmg && { deals: 1 + buff.dmg }),
          ...(buff.control && { control: 1 + buff.control }),
          ...(buff.crit && { critPoints: buff.crit }),
          ...(buff.heal && { heals: 1 + buff.heal }),
          shown: SHARD,
        });
      // The boss's: its max HP lower for the time (its health with it), and what is put on it.
      const lower = left > 0 ? (debuff.hp ?? 0) : 0;
      if (lower > 0) {
        foe.maxHp *= 1 - lower;
        foe.hp *= 1 - lower;
      }
      if (left > 0 && (debuff.taken || debuff.deals || debuff.crit || debuff.critResist))
        put(foe.statuses, {
          name: 'Shard Curse',
          art: stateArt('DefenseDown'),
          left,
          ...(debuff.taken && { takes: 1 + debuff.taken }),
          ...(debuff.deals && { deals: 1 - debuff.deals }),
          ...(debuff.crit && { crit: -debuff.crit / 1000 }),
          ...(debuff.critResist && { critTaken: debuff.critResist }),
          shown: 'curse',
        });
      let lowered = lower > 0;
      // (The next 10 seconds' mark of the fight, from its start: a boss after another goes on with the same.)
      let next = (Math.floor(fight.elapsed / COOLDOWN_EVERY) + 1) * COOLDOWN_EVERY;
      const tick = part.tick;
      return {
        ...part,
        tick(dt) {
          tick?.(dt);
          const now = fight.elapsed;
          // (Its max HP back as the time ends, its share of it kept.)
          if (lowered && now >= lasts) {
            lowered = false;
            foe.maxHp /= 1 - lower;
            foe.hp /= 1 - lower;
          }
          // (Solenis' from T3: every 10 seconds, cooldowns shorter and mana, while its time lasts.)
          if ((!buff.cooldown && !buff.mana) || now < next || now > lasts) return;
          next += COOLDOWN_EVERY;
          for (const on of fight.field) {
            if (on.hp <= 0) continue;
            if (buff.cooldown) on.cooldowns = on.cooldowns.map((wait, i) => Math.max(0, wait - (on.abilities[i]?.cooldown ?? 0) * (buff.cooldown ?? 0)));
            if (buff.mana) on.mana = Math.min(MAX_MANA, on.mana + buff.mana);
          }
        },
      };
    },
  };
}

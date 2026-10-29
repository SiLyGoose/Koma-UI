import { share } from '../combat/damage';
import { away, put } from '../combat/status';
import { MAX_MANA } from '../rules';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, indexed, type Passive } from './kit';

/*
 * Klaus's skills, as the game has them (what each costs, how long before it can be used again, and how
 * long what it does lasts are the game's; how hard each hits is not said there):
 * - Cut Ground: a leap and a blow down on the boss that stuns it.
 * - Shield Strike: a blow with the shield that leaves the boss slower to attack and easier to hurt.
 * - Guardian Shield: for a while every hero takes less from the boss.
 * His passive, Vow of Knights: when he blocks he strikes back, the boss hits less hard for a while, and
 * he gains mana; and when another hero is hurt, every hero is guarded better for a moment (now and then). (How often he
 * blocks is not the game's: there it comes of his gear.)
 * What is drawn for each is ../../heroes/klaus/fx.ts; what his body does for each, and for his attack, ../../heroes/klaus/moves.ts.
 *
 * His own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Cut Ground's
 * Dark does nothing here (the boss isn't drawn in, so it costs no more). Guardian Shield guards with less taken rather
 * than more DEF: its Light's 40% more makes that 35% less. Its Dark's P.Block, as Transcend 5's Light's, does nothing
 * against Galgoria (it deals only magic). Transcend 5's Dark's ATK is for each battle begun (each wave of a Dragon Raid), up to 3 times.
 */
// (How hard each of his skills hits is the King's Raid Index's, at his class's ATK: ./kit.ts's indexed.)
const CUT_GROUND = { blow: indexed('knight', 89_289), stun: 5 };
// (Its slow, as the game has it: an ATK Spd reduction, in points.)
const SHIELD_STRIKE = { blow: indexed('knight', 136_104), lasts: 20, speed: 500, exposed: 1.3 };
const GUARDIAN = { lasts: 20, taken: 0.75 };
// (And its guard when another is hurt: every hero's P.DEF and P.Crit Resistance higher a moment, now and then.)
const VOW = { blow: indexed('knight', 16_582), weak: 0.8, lasts: 8, mana: 300, ward: { defends: 1.2, critResist: 200, lasts: 5, every: 10 } };
/**
 * His own perks' numbers: Shield Strike's stun, Guardian Shield's more (and its P.Block), Vow of Knights' more taken on the
 * boss (how long, and how long it waits) and its less ATK, and Transcend 5's Dark's ATK for every ally (up to how many times).
 */
const PERKS = { bashStun: 1, guardMore: 1.4, guardBlock: 250, vow: { takes: 1.2, lasts: 10, every: 10 }, weaker: 0.1, oath: { atk: 0.15, most: 3 } };

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts): Cut Ground's more taken and mana; Shield Strike's crit
 * resist and crit chance off the boss; Guardian Shield's more of its guard; Vow of Knights' heal and P.DEF.
 */
const UT = {
  cape: { takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10, mana: 400 },
  determination: { critResist: 500, crit: [100, 120, 140, 170, 210, 250], lasts: 10 },
  insignia: { more: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  mittens: { heal: 0.02, defends: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], lasts: 5 },
};

const art = skillArt('klaus');

const VOW_OF_KNIGHTS: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Vow of Knights',
    about: `Passive. When he blocks he strikes back: the boss hits ${pct(1 - VOW.weak)} less hard for ${VOW.lasts} seconds, and he gains ${VOW.mana} mana. When another hero is hurt, every hero's P.DEF is higher for ${VOW.ward.lasts} seconds (at most every ${VOW.ward.every}).`,
    icon: '🛡️',
    art: art(3),
  },
  words: `Upon blocking, deals ${dmg('knight', VOW.blow, bookDmg('klaus', 3))} P.DMG to frontal enemies and decreases ATK of affected targets by ${pct(1 - VOW.weak)} for ${VOW.lasts} sec. Recovers ${VOW.mana} MP after hitting the target. When an ally excluding self takes DMG increases all allies' P.DEF by ${pct(VOW.ward.defends - 1)} and P.Crit Resistance by ${VOW.ward.critResist} for ${VOW.ward.lasts} sec. This effect only activates once every ${VOW.ward.every} sec.`,
};
/** What Guardian Shield gives every hero for a while: shown on each card, with how long it has left. */
const GUARDED: Buff = { name: 'Guardian Shield', about: `Takes ${pct(1 - GUARDIAN.taken)} less from the boss.`, icon: '✨', art: art(2) };
/** What Guardian Shield's Dark gives each ally besides, for as long. */
const BLOCKING: Buff = { name: 'Guardian Shield Dark', about: `P.Block +${PERKS.guardBlock}.`, icon: '🛡️', art: art(2) };
/** What Vow of Knights gives every hero when another is hurt. */
const WARDED: Buff = { name: 'Knight’s Guard', about: `P.DEF +${pct(VOW.ward.defends - 1)} and P.Crit Resist +${pct(share(VOW.ward.critResist))}.`, icon: '🛡️', art: art(3) };
/**
 * What his Transcend 5's Dark gives every ally as each battle begins, for the rest of the fight. (A name of its own: other
 * heroes' Transcend 5 Darks are on them too, and one of the same name would be put in place of the other.)
 */
const OATH: Buff = { name: 'Klaus’s Oath', about: `ATK +${pct(PERKS.oath.atk)} for each battle begun with Klaus (up to ${PERKS.oath.most} times).`, icon: '⚔️', art: art(3) };

export const KLAUS: HeroDef = {
  id: 'klaus',
  name: 'Klaus',
  class: 'knight',
  skins: ['Klaus', 'Klaus_School', 'Klaus_Summer', 'Klaus_Idol', 'Klaus_Frozen', 'Klaus_Maid', 'Klaus_NewYear', 'Klaus_Summer19', 'Klaus_Wedding', 'Klaus_Thanks'],
  // A knight whose blows are physical: as his class stands, otherwise (he blocks a good third of the blows that come at him).
  stats: { ...CLASS_STATS.knight, deals: 'physical' },
  abilities: [
    {
      name: 'Cut Ground',
      about: `A leap and a blow down on the boss that stuns it for ${CUT_GROUND.stun} seconds.`,
      words: `Leaps into the air and deals ${dmg('knight', CUT_GROUND.blow, bookDmg('klaus', 0))} P.DMG to enemies in range, stunning them for ${CUT_GROUND.stun} sec.`,
      icon: '⚔️',
      art: art(0),
      move: 'slam',
      cooldown: 9,
      cost: 2,
    },
    {
      name: 'Shield Strike',
      about: `A blow with his shield: for ${SHIELD_STRIKE.lasts} seconds the boss attacks ${pct(share(SHIELD_STRIKE.speed))} slower and takes ${pct(SHIELD_STRIKE.exposed - 1)} more.`,
      words: `Deals ${dmg('knight', SHIELD_STRIKE.blow, bookDmg('klaus', 1))} P.DMG proportional to P.DEF to enemies in range and knocks them back. Hit enemies' All DEF and ATK Spd is reduced by ${pct(SHIELD_STRIKE.exposed - 1)} and ${SHIELD_STRIKE.speed} for ${SHIELD_STRIKE.lasts} sec, respectively. Upon blocking an attack, skill cooldown is reduced by 0.5 sec.`,
      icon: '🛡️',
      art: art(1),
      move: 'bash',
      cooldown: 8,
      cost: 1,
    },
    {
      name: 'Guardian Shield',
      auto: { keeps: GUARDED.name },
      about: `For ${GUARDIAN.lasts} seconds every hero takes ${pct(1 - GUARDIAN.taken)} less from the boss.`,
      words: `All allies' P.DEF is increased for ${GUARDIAN.lasts} sec and P.Crit Resistance is increased by 300, and reduces P.DMG they take by ${pct(1 - GUARDIAN.taken)}..`,
      icon: '✨',
      art: art(2),
      move: 'guard',
      cooldown: 12,
      cost: 2,
    },
  ],
  passive: VOW_OF_KNIGHTS,
  treasures: [
    treasure('Cape of Justice', (k) => ({
      words: `[Cut Ground] Increases All DMG the target takes by ${pct(k(UT.cape.takes))} for ${UT.cape.lasts} sec and recovers own Mana by ${UT.cape.mana} per 1 hit enemy.`,
      skill: { index: 0, mark: { name: 'Cape of Justice', takes: 1 + k(UT.cape.takes), lasts: UT.cape.lasts }, mana: UT.cape.mana },
    })),
    treasure('Firm Determination', (k) => ({
      words: `[Shield Strike] Reduces hit enemies' All Crit Resistance by ${UT.determination.critResist} and Crit Chance by ${k(UT.determination.crit)} for ${UT.determination.lasts} sec.`,
      skill: { index: 1, mark: { name: 'Firm Determination', critTaken: UT.determination.critResist, crit: -share(k(UT.determination.crit)), lasts: UT.determination.lasts } },
    })),
    // (His guard is less taken here: its more makes that less again, as his Light's does.)
    treasure('Guardian Knight Insignia', (k) => ({
      words: `[Guardian Shield] Upon activation, dispels all negative effects from self and increases DEF Boost by ${pct(k(UT.insignia.more))}.`,
      skill: { index: 2, cleanse: 'self' },
    })),
    treasure('Mittens', (k) => ({
      words: `[Vow of Knights] Upon activation, heals HP by ${pct(UT.mittens.heal)} of Max HP, and increases own P.DEF by ${pct(k(UT.mittens.defends))} for ${UT.mittens.lasts} sec.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, cooldown: -2 } }, ({ skill }) => `Cooldown is reduced by ${-skill.cooldown} sec.`),
    's1-dark': { words: 'In exchange for 1 additional Mana Cost, the skill has a 100% chance to draw the target in.' },
    's2-light': said(
      { skill: { index: 1, mark: { name: 'Weakness', takes: 1.25, lasts: 10 } } },
      ({ skill: { mark } }) => `Increases All DMG the target takes by ${pct(mark.takes - 1)} for ${mark.lasts} sec.`,
    ),
    's2-dark': { words: `Stuns the enemy for ${PERKS.bashStun} sec.` },
    's3-light': { words: `DEF boost is increased by ${pct(PERKS.guardMore - 1)}.` },
    's3-dark': { words: `Increases P.Block Chance by ${PERKS.guardBlock} for the duration.` },
    's4-light': { words: `Increases All DMG the hit target takes by ${pct(PERKS.vow.takes - 1)} for ${PERKS.vow.lasts} sec. A ${PERKS.vow.every} sec Cooldown will be applied.` },
    's4-dark': { words: `Reduce an additional ${pct(PERKS.weaker)} of ATK.` },
    't5-light': t5Light({ blockPhysical: 200 }, ({ blockPhysical }) => `P. Block +${blockPhysical}`),
    't5-dark': {
      words: `At the beginning of each battle, increases ATK of all allies by ${pct(PERKS.oath.atk)}. This effect can be stacked up to max ${PERKS.oath.most} times and is irremovable.`,
    },
  },
  // Without an animation for his attack: his sword from side to side.
  attack: 'swing',
  // His animations: one slash where he stands; Guardian Shield, his shield brought down to the ground.
  timing: { attack: [{ lands: [0.68], until: 0.8 }], skills: { guard: { lands: [1.75], until: 2.6 } } },
  join(fight, self) {
    /** The heroes on the field and standing. */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** Until Vow of Knights may guard every hero again, and its Light leave the boss taking more again; the wave last begun (Transcend 5's Dark). */
    let warding = 0;
    let vowing = 0;
    let wave = 0;
    return {
      lands: {
        // His attack written in code: a cut across the boss one way, then the other.
        swing() {
          fight.hit(self, fight.basic);
        },
        // Down out of the air on the boss: the boss is stunned.
        slam() {
          fight.hit(self, CUT_GROUND.blow);
          fight.stun(CUT_GROUND.stun, { by: self });
        },
        // The shield into the boss: it is slower to attack, and easier to hurt, for a long while.
        bash() {
          fight.hit(self, SHIELD_STRIKE.blow);
          put(fight.foe.statuses, { name: 'Exposed', left: SHIELD_STRIKE.lasts, takes: SHIELD_STRIKE.exposed, shown: 'curse' });
          fight.slow(SHIELD_STRIKE.speed, SHIELD_STRIKE.lasts);
          if (self.perks.has('s2-dark')) fight.stun(PERKS.bashStun, { by: self });
        },
        // The shield raised: every hero is guarded.
        guard() {
          // (Its Light: more less taken; and Guardian Knight Insignia's more again.)
          const more = (self.perks.has('s3-light') ? PERKS.guardMore : 1) * (1 + fromTreasure(self, 2, UT.insignia.more));
          const taken = Math.max(0, 1 - (1 - GUARDIAN.taken) * more);
          put(fight.party, { name: GUARDED.name, left: GUARDIAN.lasts, takes: taken, shown: GUARDED });
          // (Its Dark: every ally's P.Block higher for as long. A hero's block is its own statuses', not the party's: so on each.)
          if (self.perks.has('s3-dark')) for (const ally of allies()) put(ally.statuses, { name: BLOCKING.name, left: GUARDIAN.lasts, blocks: { physical: PERKS.guardBlock }, shown: BLOCKING });
        },
      },
      // Blocked: a blow back, the boss hits less hard for a while, and mana gained.
      blocked() {
        fight.cue(self, 'vow');
        fight.hit(self, VOW.blow);
        put(fight.foe.statuses, { name: 'Weakened', art: art(3), left: VOW.lasts, deals: VOW.weak - (self.perks.has('s4-dark') ? PERKS.weaker : 0), shown: 'slow' });
        // (Its Light: the boss takes more for a while, now and then.)
        if (self.perks.has('s4-light') && vowing <= 0) {
          vowing = PERKS.vow.every;
          put(fight.foe.statuses, { name: 'Vow of Knights', art: art(3), left: PERKS.vow.lasts, takes: PERKS.vow.takes, shown: 'curse' });
        }
        self.mana = Math.min(MAX_MANA, self.mana + VOW.mana);
        // (Mittens: healed, and his P.DEF higher a moment.)
        if (wearsTreasure(self, 3)) {
          fight.heal(self, UT.mittens.heal * self.stats.hp, undefined, self);
          put(self.statuses, { name: 'Mittens', left: UT.mittens.lasts, defends: { physical: 1 + fromTreasure(self, 3, UT.mittens.defends) }, shown: { name: 'Mittens', about: `P.DEF +${pct(fromTreasure(self, 3, UT.mittens.defends))}.`, icon: '🧤', art: art(3) } });
        }
      },
      // Another hero hurt: every hero guarded better a moment (Vow of Knights), now and then.
      hurt(who) {
        if (who === self || warding > 0 || self.hp <= 0) return;
        warding = VOW.ward.every;
        put(fight.party, { name: WARDED.name, left: VOW.ward.lasts, defends: { physical: VOW.ward.defends }, critResist: { physical: VOW.ward.critResist }, shown: WARDED });
      },
      tick(dt) {
        warding = Math.max(0, warding - dt);
        vowing = Math.max(0, vowing - dt);
        // As each battle begins: every ally's ATK higher for the rest of the fight (his Transcend 5's Dark), a stack more each time.
        if (self.perks.has('t5-dark') && fight.wave !== wave && fight.field.includes(self) && self.hp > 0) {
          wave = fight.wave;
          for (const ally of allies()) {
            const stacks = Math.min(PERKS.oath.most, (ally.statuses.find((status) => status.name === OATH.name)?.count ?? 0) + 1);
            put(ally.statuses, { name: OATH.name, left: Infinity, atk: PERKS.oath.atk * stacks, count: stacks, shown: OATH });
          }
        }
      },
    };
  },
};

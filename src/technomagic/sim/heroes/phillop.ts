import { POINTS } from '../combat/damage';
import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, treasureTier } from '../treasures';
import { num, pct, skillArt, type Buff } from '../shown';
import { atTier, ATEIN, ATEIN_UP, DRAGON_RAGE } from '../unique';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, indexed, type Passive } from './kit';

/*
 * Phillop's skills, as the game has them (what each costs, how long before it can be used again, how long what it does
 * lasts, and Earth Incarnate's and Destroy Armor's numbers are the game's; how hard each hits is not said there):
 * - Collision: a blow that knocks the boss down.
 * - Headbutt: a dash and a blow that knocks the boss back (it doesn't move: nothing), its attacks slower for a while.
 * - Earth Incarnate: for 15 seconds his defense far higher and he can't be knocked down; and he is healed.
 * His passive, Destroy Armor: each attack of his takes from the boss's P.DEF for 15 seconds (up to 5 times over).
 * His unique weapon (../unique.ts) is worked here too: hurt by the boss, every other ally's defense is higher a
 * moment, and he gains a stack of Dragon Rage, each his ATK and defense higher.
 * What is drawn for each is ../../heroes/phillop/fx.ts; what his body does for each, and for his attack, ../../heroes/phillop/moves.ts.
 *
 * His own perks (../perks.ts) are King's Raid's: what is a share of his max HP deals that much (as so many thousandths
 * of his ATK). Collision's Dark always holds once (there is only the boss), and Destroy Armor's Dark has nothing on the
 * boss to dispel: only its more P.DMG taken.
 */
// (How hard each of his skills hits is the King's Raid Index's, at his class's ATK: ./kit.ts's indexed.)
const COLLISION = { blow: indexed('knight', 87_446), down: 3 };
// (Its slow, as the game has it: an ATK Spd reduction, in points.)
const HEADBUTT = { blow: indexed('knight', 72_113), speed: 200, slowed: 10 };
const INCARNATE = { defense: 36_550, heal: 0.15, lasts: 15 };
/** Destroy Armor: what each stack takes off the boss's P.DEF, for `lasts` seconds, up to `most`. */
const ARMOR = { defense: 3159, lasts: 15, most: 5 };
/** His own perks' numbers: Headbutt's blow more and Earth Incarnate's every second (shares of his max HP), the stuns, Destroy Armor's (at full stacks, and its Dark), and Transcend 5's Dark. */
const PERKS = {
  headbutt: 0.1,
  stun: 3,
  quake: { each: 0.01, every: 1 },
  broken: 0.01,
  exposed: { takes: 1.2, lasts: 20, every: 20 },
  bash: { chance: 0.1, stun: 2, blow: 0.1 },
};

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts): Collision's less CC resist and P.Block on the boss (points);
 * Headbutt's cheaper and less P.Crit resist on the boss (points); Earth Incarnate's attack speed and crit chance (points)
 * and more of its defense; and Destroy Armor's weaker boss and less healing for it, for each stack.
 */
const UT = {
  decoration: { resist: 250, block: [240, 290, 350, 420, 500], lasts: 10 },
  helmet: { cost: -1, critResist: [240, 290, 350, 420, 500], lasts: 10 },
  hammer: { speed: 250, crit: 250, defense: [0.24, 0.29, 0.35, 0.42, 0.5] },
  titan: { weaker: 0.2, heals: [0.048, 0.058, 0.07, 0.084, 0.1] },
};

const art = skillArt('phillop');

const DESTROY_ARMOR: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Destroy Armor', about: `Passive. Each attack of his takes ${num(ARMOR.defense)} off the boss’s P.DEF for ${ARMOR.lasts} seconds (up to ${ARMOR.most} times).`, icon: '🪓', art: art(3) },
  words: `Upon attacking, weakens enemy P.DEF by ${num(ARMOR.defense)} for ${ARMOR.lasts} sec. Can be stacked up to ${ARMOR.most} times max.`,
};
/** Earth Incarnate: shown on his card while it lasts. */
const INCARNATION: Buff = { name: 'Earth Incarnate', about: `+${num(INCARNATE.defense)} P.DEF and M.DEF; he can’t be knocked down.`, icon: '⛰️', art: art(2) };
/** What his attack leaves on the boss. */
const BROKEN = 'Destroy Armor';
const EXPOSED = 'Destroy Armor (exposed)';

export const PHILLOP: HeroDef = {
  id: 'phillop',
  name: 'Phillop',
  class: 'knight',
  skins: ['Phillop'],
  // A knight (his blows physical): as his class stands.
  stats: { ...CLASS_STATS.knight, deals: 'physical' },
  abilities: [
    {
      name: 'Collision',
      about: `A blow that knocks the boss down for ${COLLISION.down} seconds.`,
      words: `Deals ${dmg('knight', COLLISION.blow, bookDmg('phillop', 0))} P.DMG and knocks down the enemy for ${COLLISION.down} sec.`,
      icon: '💥',
      art: art(0),
      move: 'collision',
      cooldown: 12,
      cost: 3,
    },
    {
      name: 'Headbutt',
      about: `A dash and a blow: the boss’s attacks ${pct(HEADBUTT.speed / POINTS)} slower for ${HEADBUTT.slowed} seconds.`,
      words: `Dashes toward the enemy and deals ${dmg('knight', HEADBUTT.blow, bookDmg('phillop', 1))} P.DMG, knocking them back. Hit enemy's Attack Spd is reduced by ${pct(HEADBUTT.speed / POINTS)} for ${HEADBUTT.slowed} sec.`,
      icon: '🐏',
      art: art(1),
      move: 'headbutt',
      cooldown: 8,
      cost: 2,
    },
    {
      name: 'Earth Incarnate',
      about: `For ${INCARNATE.lasts} seconds +${num(INCARNATE.defense)} P.DEF and M.DEF, and he can’t be knocked down; he is healed ${pct(INCARNATE.heal)} of his HP.`,
      words: `Increases P.DEF and M.DEF by ${num(INCARNATE.defense)} for ${INCARNATE.lasts} sec and heals ${pct(INCARNATE.heal)} of HP. Gains CC immunity.`,
      icon: '⛰️',
      art: art(2),
      move: 'incarnate',
      cooldown: 22,
      cost: 3,
      auto: { keeps: INCARNATION.name },
    },
  ],
  passive: DESTROY_ARMOR,
  treasures: [
    treasure('Mad Dragon Shield Decoration', (k) => ({
      words: `[Collision] Reduces the target's CC Resist by ${UT.decoration.resist} and P.Block chance by ${k(UT.decoration.block)} for ${UT.decoration.lasts} sec.`,
      skill: { index: 0, mark: { name: 'Mad Dragon Shield Decoration', resist: -UT.decoration.resist, blocks: { physical: -k(UT.decoration.block) }, lasts: UT.decoration.lasts } },
    })),
    treasure('Dwarfish Capricorn Helmet', (k) => ({
      words: `[Headbutt] Reduces Mana Cost by ${-UT.helmet.cost} and reduces P.Crit Resistance of the affected enemy by ${k(UT.helmet.critResist)} for ${UT.helmet.lasts} sec.`,
      skill: { index: 1, cost: UT.helmet.cost, mark: { name: 'Dwarfish Capricorn Helmet', critTaken: { physical: k(UT.helmet.critResist) }, lasts: UT.helmet.lasts } },
    })),
    treasure('Dwarven Ceremonial Hammer', (k) => ({
      words: `[Earth Incarnate] For the duration of skill, ATK Spd and Crit chance is increased by ${UT.hammer.speed}, and DEF boost is increased by ${pct(k(UT.hammer.defense))}.`,
    })),
    treasure('Hammer of Titan', (k) => ({
      words: `[Destroy Armor] Upon attack, reduces the target's ATK by ${pct(UT.titan.weaker)} and each stack reduces its Heal Rate by ${Math.round(k(UT.titan.heals) * 1000) / 10}%.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, cost: -1 } }, ({ skill }) => `Mana cost is reduced by ${-skill.cost}.`),
    's1-dark': said({ skill: { index: 0, cooldownShare: 0.9 } }, ({ skill }) => `Cooldown is reduced by ${pct(1 - skill.cooldownShare)} per each enemy hit.`),
    's2-light': { words: `Deals extra P.DMG equal to ${pct(PERKS.headbutt)} of max HP.` },
    's2-dark': { words: `Effect changes to a ${PERKS.stun} sec Stun to nearby enemies.` },
    's3-light': { words: `Deals ${pct(PERKS.quake.each)} of Max HP as DMG per sec to nearby enemies.` },
    's3-dark': { words: `Stuns nearby enemies for ${PERKS.stun} sec.` },
    's4-light': { words: `Enemies with ${ARMOR.most} stacks take ${pct(PERKS.broken)} extra P.DMG based off Max HP per attack.` },
    's4-dark': { words: `Upon attack, dispel all positive effects and target receives ${pct(PERKS.exposed.takes - 1)} increased P.DMG for ${PERKS.exposed.lasts} sec. Has a cooldown of ${PERKS.exposed.every} sec.` },
    't5-light': t5Light({ blockPhysical: 200 }, ({ blockPhysical }) => `P. Block +${blockPhysical}`),
    't5-dark': { words: `When auto attacking, there is a ${pct(PERKS.bash.chance)} chance to Stun the target for ${PERKS.bash.stun} sec and deal extra DMG worth ${pct(PERKS.bash.blow)} of own HP.` },
  },
  attack: 'hew',
  // His animations: a downward blow of his axe; and Earth Incarnate a battle cry, his power rising as he roars.
  timing: { attack: [{ lands: [0.88], until: 1.5 }], skills: { incarnate: { lands: [0.5], until: 2.2 } } },
  join(fight, self) {
    /** Destroy Armor's stacks, and how long they last yet; how long Earth Incarnate lasts yet, and toward its Light's next blow; its Dark's wait; his Dragon Rage. */
    let broken = 0;
    let brokenLeft = 0;
    let incarnate = 0;
    let quake = 0;
    let exposed = 0;
    let rage = 0;
    let rageLeft = 0;
    const tier = self.unique?.tier ?? null;

    /** A blow of so much of his max HP (as thousandths of his ATK, as a blow's numbers are). */
    const ofHp = (share: number): number => (share * self.stats.hp * POINTS) / self.stats.atk;
    /** What Destroy Armor's stacks leave of the boss's P.DEF. */
    const armored = (): void => {
      const physical = fight.foe.def.stats.physical;
      // (Hammer of Titan: the boss weaker, and healed less for each.)
      const titan = treasureTier(self, 3) > 0 ? { deals: 1 - UT.titan.weaker, heals: Math.max(0, 1 - fromTreasure(self, 3, UT.titan.heals) * broken) } : {};
      put(fight.foe.statuses, { name: BROKEN, left: ARMOR.lasts, count: broken, defends: { physical: physical > 0 ? Math.max(0, 1 - (ARMOR.defense * broken) / physical) : 1 }, ...titan, shown: 'curse' });
    };
    /** His Dragon Rage, as his ATK and defense have it. */
    const raging = (): void => {
      if (tier === null) return;
      const more = 1 + atTier(ATEIN.rage, tier) * rage;
      put(self.statuses, { name: DRAGON_RAGE.name, left: ATEIN.lasts, count: rage, deals: more, defends: more, shown: DRAGON_RAGE });
    };

    /** His attack: a stack of Destroy Armor (all begun again; its Light, at full stacks, a blow more; its Dark, now and then the boss exposed). */
    const hew = (): void => {
      fight.hit(self, fight.basic);
      broken = Math.min(ARMOR.most, broken + 1);
      brokenLeft = ARMOR.lasts;
      armored();
      if (self.perks.has('s4-light') && broken >= ARMOR.most) fight.hit(self, ofHp(PERKS.broken), false);
      if (self.perks.has('s4-dark') && exposed <= 0) {
        exposed = PERKS.exposed.every;
        put(fight.foe.statuses, { name: EXPOSED, left: PERKS.exposed.lasts, takes: { physical: PERKS.exposed.takes }, shown: 'curse' });
      }
      // (Transcend 5's Dark: now and then a stun and a blow more.)
      if (self.perks.has('t5-dark') && fight.roll() < PERKS.bash.chance) {
        fight.stun(PERKS.bash.stun, { by: self });
        fight.hit(self, ofHp(PERKS.bash.blow), false);
      }
    };

    return {
      lands: {
        // His attack: a blow of his axe, as written in code; or as his animation for it has it.
        hew,
        attack: hew,
        collision() {
          fight.hit(self, COLLISION.blow);
          fight.stun(COLLISION.down, { down: true, by: self });
        },
        // A blow, and the boss slowed (its Light: a blow more; its Dark: a stun in place of the slow).
        headbutt() {
          fight.hit(self, HEADBUTT.blow + (self.perks.has('s2-light') ? ofHp(PERKS.headbutt) : 0));
          if (self.perks.has('s2-dark')) fight.stun(PERKS.stun, { by: self });
          else fight.slow(HEADBUTT.speed, HEADBUTT.slowed);
        },
        // His defense far higher for a while, and he is healed (its Dark: the boss stunned).
        incarnate() {
          incarnate = INCARNATE.lasts;
          quake = 0;
          // (Dwarven Ceremonial Hammer: quicker, likelier critical, and more defense.)
          const hammer = treasureTier(self, 2) > 0;
          const defense = INCARNATE.defense * (1 + fromTreasure(self, 2, UT.hammer.defense));
          put(self.statuses, { name: INCARNATION.name, left: INCARNATE.lasts, bolsters: { physical: defense, magical: defense }, ...(hammer && { pace: 1 + UT.hammer.speed / POINTS, crit: UT.hammer.crit / POINTS }), shown: INCARNATION });
          fight.heal(self, INCARNATE.heal * self.stats.hp);
          if (self.perks.has('s3-dark')) fight.stun(PERKS.stun, { by: self });
        },
      },
      // His unique weapon: hurt, every other ally's defense higher a moment, and a stack of Dragon Rage.
      hurt(who) {
        if (who !== self || tier === null || self.hp <= 0) return;
        for (const ally of fight.field) if (ally !== self && ally.hp > 0) put(ally.statuses, { name: ATEIN_UP.name, left: ATEIN.guards, defends: 1 + atTier(ATEIN.defense, tier), shown: ATEIN_UP });
        rage = Math.min(ATEIN.most, rage + 1);
        rageLeft = ATEIN.lasts;
        raging();
      },
      tick(dt) {
        exposed = Math.max(0, exposed - dt);
        if (brokenLeft > 0) {
          brokenLeft -= dt;
          if (brokenLeft <= 0) broken = 0;
        }
        if (rageLeft > 0) {
          rageLeft -= dt;
          if (rageLeft <= 0) rage = 0;
        }
        // Earth Incarnate's Light: a blow every second while it lasts.
        if (incarnate <= 0) return;
        incarnate -= dt;
        if (!self.perks.has('s3-light') || self.hp <= 0) return;
        quake += dt;
        if (quake >= PERKS.quake.every) {
          quake -= PERKS.quake.every;
          fight.hit(self, ofHp(PERKS.quake.each), false);
        }
      },
      guards: () => incarnate > 0,
      lit: () => broken >= ARMOR.most,
    };
  },
};

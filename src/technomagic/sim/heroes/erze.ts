import { share } from '../combat/damage';
import { put, type Status } from '../combat/status';
import { said, t5Light } from '../perks';
import { BLOW, MAX_MANA } from '../rules';
import { pct, skillArt, type Buff, type Mark } from '../shown';
import { atTier, PERION, PERION_UP } from '../unique';
import { CLASS_STATS, dmg, indexed, type Ability, type HeroDef, type Passive } from './kit';

/*
 * Erze's skills, as the game has them (what each costs, how long before it can be used again, how long what it does
 * lasts, the HP each steals, and her stacks are the game's; how hard each hits is not said there). She is an assassin,
 * a vampire.
 * - Sweet Blood: a blow that steals HP, its cooldown shorter for the hit; and a stack of it (at 5, used again, two
 *   blows more, the stacks spent).
 * - Soaking Blood: what the boss has left on her cleared, and for 5 seconds nothing touches her and she can't be knocked
 *   down; a stack of it on the boss, and one more for each blow of her attack on it (up to 6). After 5 seconds a blow
 *   on it that steals HP, a blow more for every 3 stacks (spent).
 * - Blood Liberation: for 10 seconds, every second a blow and a blow more.
 * Her passive, Life Drinker: a blow that would bring her down casts Soaking Blood instead, if it is ready (its
 * cooldown begun, all her mana spent), and her max HP 40% lower after (here: what she can be healed to). What it gives
 * for each enemy killed is nothing here: there is only the boss, and killing it ends the fight.
 * Her unique weapon (../unique.ts) is worked here too: each blow of her skills a stack, each her ATK and attack speed higher.
 * What is drawn for each is ../../heroes/erze/fx.ts; what her body does for each, and for her attack, ../../heroes/erze/moves.ts.
 *
 * Her own perks (../perks.ts) are King's Raid's. Life Drinker's Dark does nothing here (it is for an enemy killed), nor
 * its Light's more max HP for one: only its smaller cut to her max HP.
 */
// (How hard each of her skills hits is the King's Raid Index's, at her class's ATK: ./kit.ts's indexed.)
const DRAIN = { blow: BLOW * 1.2 };
/** Sweet Blood: its blow, the share of what it deals she steals, how much shorter its cooldown is for the hit; its stacks, and the blows more at the most. */
const SWEET = { blow: indexed('assassin', 104_556), steals: 0.1, sooner: 0.5, most: 5, more: 2 };
/** Soaking Blood: how long nothing touches her, how long before its blow; the most stacks on the boss; its blow, a blow more for every `per` stacks, and the share of what it deals she steals. */
const SOAK = { lasts: 5, after: 5, most: 6, blow: indexed('assassin', 76_974), per: 3, steals: 0.25 };
/** Blood Liberation: how long, a blow every `every` seconds and a blow more each time. */
const LIBERATION = { lasts: 10, every: 1, blow: indexed('assassin', 40_404) };
/** Life Drinker: her max HP lower by this share once it has spared her. */
const DRINKER = { cut: 0.4 };
/** Her own perks' numbers: Sweet Blood's Light and Dark, Soaking Blood's Light, Blood Liberation's Light, Life Drinker's Light, and Transcend 5's Dark. */
const PERKS = { mana: 150, sweeter: { more: 0.1, most: 30 }, stun: 3, liberated: 75, cut: 0.33, last: 0.25 };

const art = skillArt('erze');

const LIFE_DRINKER: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Life Drinker',
    about: `Passive. A blow that would bring her down casts [Soaking Blood] instead (if it is ready: all her mana spent), and her max HP is ${pct(DRINKER.cut)} lower after. (What it gives for each enemy killed: nothing here.)`,
    icon: '🦇',
    art: art(3),
  },
  words: `Increases ATK by 4212 and Max HP by 21076 upon killing an enemy. Stacks up to max 50. Upon taking fatal DMG, casts [Soaking Blood], and decreases Max HP by ${pct(DRINKER.cut)}. This effect is not applied when [Soaking Blood] is in cooldown. This skill consumes all Mana upon activation.`,
};
/** Sweet Blood's stacks, Soaking Blood on her: shown on her card. */
const SWEETENED: Buff = { name: 'Sweet Blood', about: `At ${SWEET.most}, [Sweet Blood] strikes more.`, icon: '🩸', art: art(0) };
const SOAKED: Buff = { name: 'Soaking Blood', about: 'Nothing touches her, and she can’t be knocked down.', icon: '🛡️', art: art(1) };
const LIBERATED: Buff = { name: 'Blood Liberation', about: 'Blows every second.', icon: '🌹', art: art(2) };

export const ERZE: HeroDef = {
  id: 'erze',
  name: 'Erze',
  class: 'assassin',
  skins: ['Erze'],
  // An assassin (her blows physical): as her class stands.
  stats: { ...CLASS_STATS.assassin, deals: 'physical' },
  abilities: [
    {
      name: 'Sweet Blood',
      about: `A blow that steals ${pct(SWEET.steals)} of what it deals, its cooldown ${SWEET.sooner} seconds shorter; and a stack of it (at ${SWEET.most}, ${SWEET.more} blows more).`,
      words: `Deals ${dmg('assassin', SWEET.blow)} P.DMG to all enemies and steals HP equal to ${pct(SWEET.steals)} of DMG dealt. Reduces Cooldown of [Sweet Blood] by ${SWEET.sooner} sec on each hit, and gains 1 stack of [Sweet Blood]. [Sweet Blood] can be stacked up to ${SWEET.most} times, and using the skill with ${SWEET.most} stacks of [Sweet Blood] grants additional hits and removes [Sweet Blood] stacks.`,
      icon: '🩸',
      art: art(0),
      move: 'sweet',
      cooldown: 5,
      cost: 2,
    },
    {
      name: 'Soaking Blood',
      about: `For ${SOAK.lasts} seconds nothing touches her and she can’t be knocked down; after ${SOAK.after}, a blow on the boss that steals ${pct(SOAK.steals)} of what it deals (a blow more for every ${SOAK.per} stacks of it).`,
      words: `Dispels all negative effects and gains immunity to all CCs, P.DMG, and M.DMG for ${SOAK.lasts} sec. Inflicts 1 stack of [Soaking Blood] on all enemies, and additional 1 stack upon attacking a target with [Soaking Blood]. [Soaking Blood] can be stacked up to ${SOAK.most} times. Deals ${dmg('assassin', SOAK.blow)} P.DMG to enemies with [Soaking Blood] stacks after ${SOAK.after} sec, and steals HP equal to ${pct(SOAK.steals)} of the DMG dealt. For every ${SOAK.per} stack(s) of [Soaking Blood], hit count increases by 1 and removes [Soaking Blood] stacks upon attacking.`,
      icon: '🛡️',
      art: art(1),
      move: 'soak',
      cooldown: 35,
      cost: 2,
    },
    {
      name: 'Blood Liberation',
      about: `For ${LIBERATION.lasts} seconds, every second a blow and a blow more.`,
      words: `Deals ${dmg('assassin', LIBERATION.blow)} P.DMG to all enemies every ${LIBERATION.every} sec for ${LIBERATION.lasts} sec. Each hit of [Blood Liberation] causes an additional hit on 1 random enemy.`,
      icon: '🌹',
      art: art(2),
      move: 'liberation',
      cooldown: 14,
      cost: 3,
    },
  ],
  passive: LIFE_DRINKER,
  perks: {
    's1-light': { words: `Recovers ${PERKS.mana} Mana every hit.` },
    's1-dark': { words: `Each use increases DMG by ${pct(PERKS.sweeter.more)}. Stacks ${PERKS.sweeter.most} times max.` },
    's2-light': { words: `Stuns the target for ${PERKS.stun} sec upon hit.` },
    's2-dark': said({ skill: { index: 1, cost: -1 } }, ({ skill }) => `Mana cost is reduced by ${-skill.cost}.`),
    's3-light': { words: `Recovers ${PERKS.liberated} Mana every hit.` },
    's3-dark': said({ skill: { index: 2, cost: 1, dmg: 2 } }, ({ skill }) => `Mana cost is increased by ${skill.cost} orb but DMG is boosted by ${pct(skill.dmg - 1)}.`),
    's4-light': { words: `Increases Max HP by 100% upon killing an enemy and changes the Max HP reduction after auto-casting [Soaking Blood] to ${pct(PERKS.cut)}.` },
    's4-dark': { words: 'Increases ATK by 200% upon killing an enemy, but Max HP boost does not apply.' },
    't5-light': t5Light({ crit: 100 }, ({ crit }) => `Crit Chance +${crit}`),
    't5-dark': { words: `Steals HP equal to ${pct(PERKS.last)} of DMG dealt by the final normal attack and gains 1 stack of [Sweet Blood].` },
  },
  attack: 'drain',
  join(fight, self) {
    /** Sweet Blood's stacks, and its Dark's uses; how long nothing touches her yet, and until Soaking Blood's blow, its stacks on the boss; how long Blood Liberation lasts yet, and toward its next blow; her max HP's cut (0: none yet); her unique weapon's stacks, and how long they last yet. */
    let sweet = 0;
    let sweeter = 0;
    let soaked = 0;
    let soaking = 0;
    let soakStacks = 0;
    let liberated = 0;
    let liberating = 0;
    let cut = 0;
    let greed = 0;
    let greedLeft = 0;
    const tier = self.unique?.tier ?? null;

    /** A blow of hers that steals a share of what it deals (none: none), and (a skill's) a stack of her unique weapon's. */
    const drink = (amount: number, steals: number, skill: boolean, counted = true): boolean => {
      const before = self.dealt;
      const critical = fight.hit(self, amount, counted);
      const dealt = self.dealt - before;
      if (steals > 0 && dealt > 0) fight.heal(self, dealt * steals);
      if (skill && dealt > 0 && tier !== null) {
        greed = Math.min(atTier(PERION.most, tier), greed + 1);
        greedLeft = PERION.lasts;
        put(self.statuses, { name: PERION_UP.name, left: PERION.lasts, count: greed, deals: 1 + PERION.atk * greed, pace: 1 + share(PERION.speed * greed), shown: PERION_UP });
      }
      return critical;
    };
    /** Soaking Blood: what the boss has left on her cleared, nothing touching her for a while, a stack of it on the boss and its blow to come. */
    const soak = (): void => {
      const harmful = (status: Status<Buff>): boolean => status.shown.harmful === true && !status.binds && !status.away;
      self.statuses = self.statuses.filter((status) => !harmful(status));
      soaked = SOAK.lasts;
      soaking = SOAK.after;
      soakStacks = Math.min(SOAK.most, soakStacks + 1);
      put(self.statuses, { name: SOAKED.name, left: SOAK.lasts, guards: true, shown: SOAKED });
    };
    /** Her attack: a blow (a stack of Soaking Blood more, on a boss that has it). */
    const attack = (amount: number): void => {
      // (Transcend 5's Dark: the last blow of her attack, its only one, steals HP, and a stack of Sweet Blood.)
      const final = self.perks.has('t5-dark');
      drink(amount, final ? PERKS.last : 0, false);
      if (final) sweet = Math.min(SWEET.most, sweet + 1);
      if (soakStacks > 0 && soaking > 0) soakStacks = Math.min(SOAK.most, soakStacks + 1);
    };

    return {
      lands: {
        // Her attack: a blow of blood from what floats by her hand.
        drain: () => attack(DRAIN.blow),
        // A blow that steals HP (its Light: mana), its cooldown shorter, a stack; at the most, blows more (the stacks spent). Its Dark: harder each time.
        sweet() {
          const full = sweet >= SWEET.most;
          const harder = 1 + PERKS.sweeter.more * sweeter;
          if (self.perks.has('s1-dark')) sweeter = Math.min(PERKS.sweeter.most, sweeter + 1);
          for (let i = 0; i < (full ? 1 + SWEET.more : 1); i++) {
            drink(SWEET.blow * harder, SWEET.steals, true);
            if (self.perks.has('s1-light')) self.mana = Math.min(MAX_MANA, self.mana + PERKS.mana);
            self.cooldowns[0] = Math.max(0, (self.cooldowns[0] ?? 0) - SWEET.sooner);
          }
          sweet = full ? 0 : sweet + 1;
        },
        soak,
        // Blood Liberation: begun (its blows come every second, of themselves).
        liberation() {
          liberated = LIBERATION.lasts;
          liberating = 0;
          put(self.statuses, { name: LIBERATED.name, left: LIBERATION.lasts, shown: LIBERATED });
        },
      },
      tick(dt) {
        soaked = Math.max(0, soaked - dt);
        if (greedLeft > 0) {
          greedLeft -= dt;
          if (greedLeft <= 0) greed = 0;
        }
        // Her max HP cut: no more health than what is left of it.
        if (cut > 0) self.hp = Math.min(self.hp, self.stats.hp * (1 - cut));
        // Soaking Blood's blow, its time come: a blow more for every 3 stacks (spent), each stealing HP (its Light: stunning).
        if (soaking > 0) {
          soaking -= dt;
          if (soaking <= 0 && soakStacks > 0 && self.hp > 0) {
            const blows = 1 + Math.floor(soakStacks / SOAK.per);
            soakStacks = 0;
            for (let i = 0; i < blows; i++) drink(SOAK.blow * (self.moveDmg.soak ?? 1), SOAK.steals, true);
            if (self.perks.has('s2-light')) fight.stun(PERKS.stun, { by: self });
            fight.cue(self, 'soaked');
          }
        }
        // Blood Liberation: every second while it lasts, a blow and a blow more (its Light: mana for each; its Dark: twice as hard).
        if (liberated > 0 && self.hp > 0) {
          liberated -= dt;
          liberating += dt;
          if (liberating >= LIBERATION.every) {
            liberating -= LIBERATION.every;
            for (let i = 0; i < 2; i++) {
              drink(LIBERATION.blow * (self.moveDmg.liberation ?? 1), 0, true);
              if (self.perks.has('s3-light')) self.mana = Math.min(MAX_MANA, self.mana + PERKS.liberated);
            }
            fight.cue(self, 'liberated');
          }
        }
      },
      untouched: () => soaked > 0,
      // Life Drinker: a blow that would bring her down casts Soaking Blood, if it is ready (all her mana spent), and her max HP lower after.
      spared() {
        const index = 1;
        if ((self.cooldowns[index] ?? 0) > 0) return false;
        self.cooldowns[index] = (self.abilities[index] as Ability).cooldown;
        self.mana = 0;
        cut = self.perks.has('s4-light') ? PERKS.cut : DRINKER.cut;
        soak();
        fight.cue(self, 'drinker');
        return true;
      },
      lit: () => sweet >= SWEET.most,
      buffs: () => [...(sweet > 0 ? [{ ...SWEETENED, count: sweet }] : [])],
      marks: (): Mark[] => (soakStacks > 0 && soaking > 0 ? [{ text: `Soaking Blood ×${soakStacks} ${Math.ceil(soaking)}s`, tone: 'curse' }] : []),
    };
  },
};

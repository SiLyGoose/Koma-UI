import { share } from '../combat/damage';
import { put, type Status } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, treasureTier } from '../treasures';
import { num, pct, skillArt, type Buff } from '../shown';
import { atTier, NUMINU, NUMINU_UP } from '../unique';
import { CLASS_STATS, dmg, indexed, type HeroDef, type Passive } from './kit';
import { CODED } from './moves';

/*
 * Gau's skills, as the game has them (what each costs, how long before it can be used again, how long what it does
 * lasts, Battle Roar's ATK and Enrage's numbers are the game's; how hard each hits is not said there). He is a warrior,
 * a beastman with a great axe.
 * - Smash: two blows, the first knocking the boss down (and its attacks slower: nothing here, Galgoria is steady).
 * - Battle Roar: what the boss has left on every ally cleared, and each one's ATK higher for 15 seconds.
 * - Vortex: a whirl of blows (the harder against one that isn't a Hero: the boss), the last freezing the boss; he can't
 *   be knocked down while he whirls.
 * His passive, Enrage: each blow of his attack a stack (up to 10, for 5 seconds), each his ATK and his DMG on the boss
 * higher.
 * His unique weapon (../unique.ts) is worked here too: his max HP higher (he takes that much less), and now and then a
 * blow of his attack deals more and freezes the boss.
 * What is drawn for each is ../../heroes/gau/fx.ts; what his body does for each, and for his attack, ../../heroes/gau/moves.ts.
 *
 * His own perks (../perks.ts) are King's Raid's. Transcend 5's Light's P. Block does nothing here (Galgoria deals only
 * magic). Enrage's Dark's lifesteal heals him by what each blow of his deals.
 */
// (How hard each of his skills hits is the King's Raid Index's, at his class's ATK: ./kit.ts's indexed.)
/** Smash: its two blows, and how long the first knocks the boss down. */
const SMASH = { blow: indexed('warrior', 157_882) / CODED.smash.lands.length, down: 3, speed: 250, slowed: 10 };
/** Battle Roar: every ally's ATK more, for `lasts` seconds. */
const ROAR = { atk: 3845, lasts: 15 };
/** Vortex: its blows (as many as its move has; against one that isn't a Hero), and how long the last freezes the boss. */
const VORTEX = { blow: indexed('warrior', 347_796) / CODED.vortex.lands.length, freeze: 4 };
/** Enrage: his ATK more for each stack, and his DMG on the boss (a share), for `lasts` seconds, up to `most`. */
const ENRAGE = { atk: 901, dmg: 0.03, lasts: 5, most: 10 };
/** His own perks' numbers: Smash's Dark, Battle Roar's Light and Dark, Enrage's Light and Dark, and Transcend 5's Dark. */
const PERKS = { harder: { more: 0.15, most: 10 }, roar: 1.4, speed: 200, enrage: 1.4, fury: { taken: 0.05, crit: 50, lifesteal: 50 }, mend: { heal: 0.1, less: 0.006 } };

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts): Smash's weaker boss and more P.DMG taken; Battle Roar's
 * cheaper and every ally's crit DMG; Vortex's DMG; and Enrage's more stacks at most, and his penetration (points) at
 * the most.
 */
const UT = {
  helmet: { weaker: 0.2, takes: [0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 },
  horn: { cost: -1, critDamage: [0.24, 0.29, 0.35, 0.42, 0.5] },
  mug: { dmg: [0.1, 0.12, 0.14, 0.17, 0.2] },
  bracelet: { most: 30, pen: [120, 140, 170, 210, 250] },
};

const art = skillArt('gau');

const ENRAGED: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Enrage', about: `Passive. Each blow of his attack: +${num(ENRAGE.atk)} ATK and +${pct(ENRAGE.dmg)} DMG on the boss for ${ENRAGE.lasts} seconds (up to ${ENRAGE.most} times).`, icon: '😡', art: art(3) },
  words: `Upon attacking, increases ATK by ${num(ENRAGE.atk)} for ${ENRAGE.lasts} sec, and DMG to Non-Hero enemies by ${pct(ENRAGE.dmg)}. This effect can be stacked up to max ${ENRAGE.most} times.`,
};
/** Battle Roar on an ally; Enrage's stacks on him. */
const ROARED: Buff = { name: 'Battle Roar', about: 'ATK higher.', icon: '📯', art: art(1) };
const RAGING: Buff = { name: 'Enrage', about: 'ATK and DMG on the boss higher for each.', icon: '😡', art: art(3) };

export const GAU: HeroDef = {
  id: 'gau',
  name: 'Gau',
  class: 'warrior',
  skins: ['Gau'],
  // A warrior (his blows physical): as his class stands.
  stats: { ...CLASS_STATS.warrior, deals: 'physical' },
  abilities: [
    {
      name: 'Smash',
      about: `Two blows, the first knocking the boss down for ${SMASH.down} seconds.`,
      words: `Deals ${dmg('warrior', SMASH.blow * CODED.smash.lands.length)} P.DMG to enemies within range, and the first attack knocks them down for ${SMASH.down} sec and reduces their ATK Spd by ${SMASH.speed} for ${SMASH.slowed} sec.`,
      icon: '🪓',
      art: art(0),
      move: 'smash',
      cooldown: 8,
      cost: 2,
    },
    {
      name: 'Battle Roar',
      about: `What the boss has left on every ally is cleared, and each gains +${num(ROAR.atk)} ATK for ${ROAR.lasts} seconds.`,
      words: `All allies' ATK is increased by ${num(ROAR.atk)} for ${ROAR.lasts} sec. Upon activation, dispels all negative effects from allies.`,
      icon: '📯',
      art: art(1),
      move: 'warcry',
      cooldown: 12,
      cost: 2,
      auto: { keeps: ROARED.name },
    },
    {
      name: 'Vortex',
      about: `A whirl of blows, the last freezing the boss for ${VORTEX.freeze} seconds; he can’t be knocked down meanwhile.`,
      words: `Deals ${dmg('warrior', VORTEX.blow * CODED.vortex.lands.length)} P.DMG to nearby enemies. If the target is not a Hero, deals P.DMG. The last attack freezes nearby enemies for ${VORTEX.freeze} sec. Gains immunity to CC for the duration of Skill.`,
      icon: '🌀',
      art: art(2),
      move: 'vortex',
      cooldown: 20,
      cost: 3,
    },
  ],
  passive: ENRAGED,
  treasures: [
    treasure('King of Frost Helmet', (k) => ({
      words: `[Smash] Reduces the target's ATK by ${pct(UT.helmet.weaker)} and increases P.DMG target receives by ${pct(k(UT.helmet.takes))} for ${UT.helmet.lasts} sec.`,
      skill: { index: 0, mark: { name: 'King of Frost Helmet', deals: 1 - UT.helmet.weaker, takes: { physical: 1 + k(UT.helmet.takes) }, lasts: UT.helmet.lasts } },
    })),
    treasure('Fighter’s Horn', (k) => ({
      words: `[Battle Roar] Reduces Mana Cost by ${-UT.horn.cost} and increases Crit DMG by ${pct(k(UT.horn.critDamage))} for duration of skill.`,
      skill: { index: 1, cost: UT.horn.cost },
    })),
    treasure('Barbarian Mug', (k) => ({
      words: `[Vortex] DMG is increased by ${pct(k(UT.mug.dmg))}.`,
      skill: { index: 2, dmg: 1 + k(UT.mug.dmg) },
    })),
    treasure('Snowdrop Bracelet', (k) => ({
      words: `[Enrage] Max stack number is changed to ${UT.bracelet.most}, and after ${UT.bracelet.most}th stack, own Penetration is increased by ${k(UT.bracelet.pen)}.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, cost: -1 } }, ({ skill }) => `Mana cost is reduced by ${-skill.cost}.`),
    's1-dark': { words: `Each use increases DMG by ${pct(PERKS.harder.more)}. Stacks ${PERKS.harder.most} times max.` },
    's2-light': { words: `ATK boost is increased by ${pct(PERKS.roar - 1)}.` },
    's2-dark': { words: `ATK Spd boost of ${PERKS.speed} is added to the effect.` },
    's3-light': said({ skill: { index: 2, cooldown: -3 } }, ({ skill }) => `Cooldown reduced by ${-skill.cooldown} sec.`),
    's3-dark': { words: 'Immune to all types of DMG while in use.' },
    's4-light': { words: `ATK boost is increased by ${pct(PERKS.enrage - 1)}.` },
    's4-dark': { words: `Takes ${pct(PERKS.fury.taken)} more DMG per each stack, but gains a boost of ${PERKS.fury.crit} Crit Chance and Lifesteal per each stack as well.` },
    't5-light': t5Light({ blockPhysical: 200 }, ({ blockPhysical }) => `P. Block +${blockPhysical}`),
    't5-dark': { words: `Heals HP worth ${pct(PERKS.mend.heal)} of ATK every second, and every 1% of HP lost reduces received DMG by ${PERKS.mend.less * 100}%.` },
  },
  attack: 'chop',
  // His animations: a downward blow of his axe; and Battle Roar a battle cry.
  timing: { attack: [{ lands: [0.88], until: 1.5 }], skills: { warcry: { lands: [0.5], until: 2.2 } } },
  join(fight, self) {
    /** Enrage's stacks, and how long they last yet; Smash's Dark's uses; toward Transcend 5's Dark's next heal. */
    let rage = 0;
    let rageLeft = 0;
    let smashed = 0;
    let mending = 0;
    const tier = self.unique?.tier ?? null;
    // (Snowdrop Bracelet: more stacks at most, and penetration at the most.)
    const most = treasureTier(self, 3) > 0 ? UT.bracelet.most : ENRAGE.most;
    const bracelet = fromTreasure(self, 3, UT.bracelet.pen);

    /** Enrage's stacks on him: his ATK (its Light: more) and DMG on the boss; its Dark, his crit chance too. */
    const enraged = (): void => {
      const atk = ENRAGE.atk * (self.perks.has('s4-light') ? PERKS.enrage : 1) * rage;
      const fury = self.perks.has('s4-dark');
      put(self.statuses, { name: RAGING.name, left: ENRAGE.lasts, count: rage, deals: (1 + atk / self.stats.atk) * (1 + ENRAGE.dmg * rage), ...(fury && { crit: share(PERKS.fury.crit * rage) }), ...(bracelet > 0 && rage >= most && { pen: bracelet }), shown: RAGING });
    };
    /** A blow of his: with Enrage's Dark, he steals a share of what it deals for each stack. */
    const strike = (amount: number, counted = true): boolean => {
      const before = self.dealt;
      const critical = fight.hit(self, amount, counted);
      if (self.perks.has('s4-dark') && rage > 0) fight.heal(self, (self.dealt - before) * share(PERKS.fury.lifesteal * rage));
      return critical;
    };
    /** His attack: a blow, a stack of Enrage (all begun again); with his unique weapon, now and then a blow more and the boss frozen. */
    const chop = (amount: number): void => {
      strike(amount);
      rage = Math.min(most, rage + 1);
      rageLeft = ENRAGE.lasts;
      enraged();
      if (tier !== null && fight.roll() < NUMINU.chance) {
        strike(atTier(NUMINU.blow, tier), false);
        fight.stun(NUMINU.freeze, { by: self });
      }
    };

    return {
      lands: {
        // His attack: a blow of his axe, as written in code; or as his animation for it has it.
        chop: () => chop(fight.basic),
        attack: () => chop(fight.basic),
        // Two blows, the first knocking the boss down (and slowing it: it is steady). Its Dark: harder each time.
        smash(part) {
          strike(SMASH.blow * (1 + PERKS.harder.more * smashed));
          if (part !== 0) return;
          if (self.perks.has('s1-dark')) smashed = Math.min(PERKS.harder.most, smashed + 1);
          fight.stun(SMASH.down, { down: true, by: self });
          fight.slow(SMASH.speed, SMASH.slowed);
        },
        // What the boss has left on every ally cleared, and each one's ATK higher (its Light: more; its Dark: quicker too).
        warcry() {
          const atk = ROAR.atk * (self.perks.has('s2-light') ? PERKS.roar : 1);
          const harmful = (status: Status<Buff>): boolean => status.shown.harmful === true && !status.binds && !status.away;
          for (let i = fight.party.length - 1; i >= 0; i--) if (harmful(fight.party[i] as Status<Buff>)) fight.party.splice(i, 1);
          const on = fight.field.filter((ally) => ally.hp > 0);
          for (const ally of on) {
            ally.statuses = ally.statuses.filter((status) => !harmful(status));
            // (Fighter's Horn: crit DMG too.)
            const horn = fromTreasure(self, 1, UT.horn.critDamage);
            put(ally.statuses, { name: ROARED.name, left: ROAR.lasts, deals: 1 + atk / ally.stats.atk, ...(self.perks.has('s2-dark') && { pace: 1 + share(PERKS.speed) }), ...(horn > 0 && { critDamage: horn }), shown: ROARED });
          }
          fight.cue(self, 'warcry', on);
        },
        // A blow of the whirl; the last freezes the boss.
        vortex(part) {
          strike(VORTEX.blow);
          if (part === (self.motion.moves.vortex.parts[0]?.lands.length ?? 1) - 1) fight.stun(VORTEX.freeze, { by: self });
        },
      },
      tick(dt) {
        if (rageLeft > 0) {
          rageLeft -= dt;
          if (rageLeft <= 0) rage = 0;
        }
        // Transcend 5's Dark: healed a share of his ATK every second.
        if (!self.perks.has('t5-dark') || self.hp <= 0) return;
        mending += dt;
        if (mending < 1) return;
        mending -= 1;
        fight.heal(self, PERKS.mend.heal * self.stats.atk);
      },
      // What he takes: less with his unique weapon (his max HP higher), and (Transcend 5's Dark) the less the more he has lost; more for Enrage's Dark's stacks.
      takes() {
        const uw = tier !== null ? 1 / (1 + atTier(NUMINU.hp, tier)) : 1;
        const lost = self.perks.has('t5-dark') ? Math.max(0.1, 1 - PERKS.mend.less * 100 * (1 - self.hp / self.stats.hp)) : 1;
        const fury = self.perks.has('s4-dark') ? 1 + PERKS.fury.taken * rage : 1;
        return uw * lost * fury;
      },
      // Vortex: not to be knocked down while he whirls (its Dark: nothing touches him either).
      guards: () => self.doing?.move === 'vortex',
      untouched: () => self.perks.has('s3-dark') && self.doing?.move === 'vortex',
      lit: () => rage >= most,
      buffs: () => (tier !== null ? [NUMINU_UP] : []),
    };
  },
};

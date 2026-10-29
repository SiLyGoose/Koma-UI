import { put, type Status } from '../combat/status';
import { said, t5Light } from '../perks';
import { treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, type Buff, type Mark } from '../shown';
import { atTier, GAIAMENES, GAIAMENES_UP } from '../unique';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, indexed, indexedHeal, type Passive } from './kit';

/*
 * Loman's skills, as the game has them (what each costs, how long before it can be used again, how long what it does
 * lasts, Shrouding Creed's shield and his passive's stacks are the game's; how hard each hits is not said there):
 * - Cut Ground: a blow that knocks the boss down, and it takes more physical damage for a while.
 * - Shrouding Creed: what the boss has left on every ally cleared, and a shield on each for 5 seconds (none can be
 *   knocked down while it lasts); every ally takes less for 10 seconds.
 * - Knight's Creed: two blows that stun the boss, then a last swing (two blows) that stuns it longer and leaves the Mark
 *   of Creed on it: each other ally's blow on it a blow of his more, no sooner than half a second after the last.
 * His passive, The Last Gatekeeper: a stack of Endurance every second (and one for a block, no sooner than a moment after
 * the last); at 20, a blow through the boss's defense, and its ATK lower for a while.
 * His unique weapon (../unique.ts) is worked here too: every 3rd skill of his a blow that leaves the boss taking more
 * physical damage, and his M.DEF higher for a while.
 * What is drawn for each is ../../heroes/loman/fx.ts; what his body does for each, and for his attack, ../../heroes/loman/moves.ts.
 *
 * His own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Knight's
 * Creed's Light always holds (there is only the boss). The Last Gatekeeper's Dark slows what can be slowed (not
 * Galgoria, nor any boss that is steady).
 */
// (How hard each of his skills hits, and how much each shields, is the King's Raid Index's, at his class's ATK: ./kit.ts's indexed and indexedHeal.)
/** Cut Ground: its blow, how long the boss is down, and how much more physical damage it takes for `lasts` seconds. */
const CUT = { blow: indexed('knight', 122_794), down: 4, weakness: 0.25, lasts: 10 };
/** Shrouding Creed: the shield on every ally for `lasts` seconds (none knocked down meanwhile), and what each takes for `taken` seconds. */
const SHROUD = { absorbs: 315_448, shield: indexedHeal('knight', 315_448), lasts: 5, less: 0.8, taken: 10 };
/** Knight's Creed: its first two blows and their stun; its last swing (two blows, all of it) and its stun; the Mark of Creed's blow, how long it lasts, and how often. */
const CREED = { blow: indexed('knight', 102_676) / 2, stun: 1.5, last: indexed('knight', 242_634), lastStun: 5, mark: indexed('knight', 95_532), lasts: 15, every: 0.5 };
/** The Last Gatekeeper: Endurance a second, and for a block (no sooner than `every` after the last); at `most`, its blow (through the boss's defense), and the boss's ATK lower for `lasts` seconds. */
const GATEKEEPER = { each: 1, every: 0.2, most: 20, blow: indexed('knight', 70_202), weaker: 0.2, lasts: 10 };
/** His own perks' numbers: Cut Ground's Dark, Shrouding Creed's Dark, The Last Gatekeeper's Light and Dark (the boss's ATK Spd lower, points), and Transcend 5's Dark. */
const PERKS = { weakness: 0.25, longer: 5, each: 1, slower: { speed: 200, lasts: 10 }, ward: { block: 200, defense: 0.1, lasts: 5, every: 5 } };

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts): Cut Ground's less P.Block and CC resist on the boss (points);
 * Shrouding Creed's cheaper and every ally's mana; Knight's Creed's shorter cooldown and more P.DMG taken; and The Last
 * Gatekeeper's M.Block (points), and its more Endurance for a block.
 */
const UT = {
  techniques: { block: 500, resist: [100, 120, 140, 170, 210, 250], lasts: 10 },
  doll: { cost: -1, mana: [400, 480, 580, 700, 840, 1000] },
  sea: { cooldown: 0.3, takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 },
  shield: { block: [200, 240, 290, 350, 420, 500], endurance: 1 },
};

const art = skillArt('loman');

const LAST_GATEKEEPER: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'The Last Gatekeeper',
    about: `Passive. A stack of [Endurance] every second (and for a block); at ${GATEKEEPER.most}, a blow through the boss’s defense, and its ATK ${pct(GATEKEEPER.weaker)} lower for ${GATEKEEPER.lasts} seconds.`,
    icon: '🏰',
    art: art(3),
  },
  words: `Stacks [Endurance] every second. [Endurance] cannot be dispelled, and when stacked ${GATEKEEPER.most} times, deals ${dmg('knight', GATEKEEPER.blow, bookDmg('loman', 3))} P.DMG, ignoring DEF on nearby enemies and reduces ATK of affected enemies by ${pct(GATEKEEPER.weaker)} for ${GATEKEEPER.lasts} second(s). A successful block grants 1 additional [Endurance] stack. This effect is activated only once every ${GATEKEEPER.every} second(s).`,
};
/** Shrouding Creed's shield, and what every ally takes less for a while; Transcend 5's Dark; Endurance's stacks. */
const SHROUDED: Buff = { name: 'Shrouding Creed', about: 'A shield: it can’t be knocked down while it lasts.', icon: '🛡️', art: art(1) };
const CREED_LESS: Buff = { name: 'Shrouding Creed (less)', about: `Takes ${pct(1 - SHROUD.less)} less.`, icon: '🛡️', art: art(1) };
const WARDED: Buff = { name: 'Loman’s Ward', about: 'M.Block and M.DEF higher.', icon: '🛡️', art: art(3) };
const ENDURANCE: Buff = { name: 'Endurance', about: `At ${GATEKEEPER.most}, The Last Gatekeeper strikes.`, icon: '🏰', art: art(3) };
/** What his skills leave on the boss. */
const CUT_DOWN = 'Cut Ground';
const GATE = 'The Last Gatekeeper';
const ORVELIA = 'Blessing of Orvelia';

export const LOMAN: HeroDef = {
  id: 'loman',
  name: 'Loman',
  class: 'knight',
  skins: ['Loman', 'Loman_Summer', 'Loman_Maid', 'Loman_NewYear', 'Loman_Summer19', 'Loman_Glory', 'Loman_Glory2', 'Loman_Halloween', 'Loman_Christmas'],
  // A knight (his blows physical): as his class stands.
  stats: { ...CLASS_STATS.knight, deals: 'physical' },
  abilities: [
    {
      name: 'Cut Ground',
      about: `A blow that knocks the boss down for ${CUT.down} seconds; it takes ${pct(CUT.weakness)} more physical damage for ${CUT.lasts} seconds.`,
      words: `Deals ${dmg('knight', CUT.blow, bookDmg('loman', 0))} P.DMG to frontal enemies within range and knocks them down for ${CUT.down} sec, increasing P.Weakness of the affected targets by ${pct(CUT.weakness)} for ${CUT.lasts} sec. Blocks all DMG while the skill is in use.`,
      icon: '⚔️',
      art: art(0),
      move: 'ground',
      cooldown: 8,
      cost: 2,
    },
    {
      name: 'Shrouding Creed',
      about: `What the boss has left on every ally is cleared; a shield of ${num(SHROUD.absorbs)} on each for ${SHROUD.lasts} seconds (none can be knocked down meanwhile), and each takes ${pct(1 - SHROUD.less)} less for ${SHROUD.taken} seconds.`,
      words: `Removes negative effects from all allies. Casts a shield upon all allies that absorbs ${num(SHROUD.absorbs)} DMG for ${SHROUD.lasts} second(s) and reduces all DMG to allies by ${pct(1 - SHROUD.less)} for ${SHROUD.taken} second(s). The shield grants immunity to CC while it lasts.`,
      icon: '🛡️',
      art: art(1),
      move: 'shroud',
      cooldown: 23,
      cost: 3,
      auto: { keeps: CREED_LESS.name },
    },
    {
      name: "Knight's Creed",
      about: `Two blows that stun the boss for ${CREED.stun} seconds, and a last swing that stuns it for ${CREED.lastStun} and leaves the [Mark of Creed] on it for ${CREED.lasts}: each other ally’s blow on it a blow of his more.`,
      words: `Hits frontal enemies within range 3 times. First 2 hits deal ${dmg('knight', CREED.blow * 2, bookDmg('loman', 2))} P.DMG and stun enemies for ${CREED.stun} second(s) while the last hit attacks enemies in wider range 2 times, dealing ${dmg('knight', CREED.last, bookDmg('loman', 2))} P.DMG in total. The last hit stuns enemies for ${CREED.lastStun} seconds and leaves [Mark of Creed] on the enemies, damaging them for ${CREED.lasts} second(s). Targets with [Mark of Creed] take additional ${dmg('knight', CREED.mark, bookDmg('loman', 2))} P.DMG from allies excluding caster. Additional DMG effect is activated only once every ${CREED.every} second(s).`,
      icon: '✝️',
      art: art(2),
      move: 'creed',
      cooldown: 24,
      cost: 3,
    },
  ],
  passive: LAST_GATEKEEPER,
  treasures: [
    treasure('Basic Combat Techniques of Orvelian Knights', (k) => ({
      words: `[Cut Ground] For ${UT.techniques.lasts} sec, reduces the target's P.Block by ${UT.techniques.block} and CC Resist by ${k(UT.techniques.resist)}.`,
      skill: { index: 0, mark: { name: 'Basic Combat Techniques', blocks: { physical: -UT.techniques.block }, resist: -k(UT.techniques.resist), lasts: UT.techniques.lasts } },
    })),
    // (Its target is every ally its shield is on.)
    treasure('Wooden Doll Miniature', (k) => ({
      words: `[Shrouding Creed] Reduces Mana Cost by ${-UT.doll.cost} and recovers target's Mana by ${k(UT.doll.mana)}.`,
      skill: { index: 1, cost: UT.doll.cost, allyMana: k(UT.doll.mana) },
    })),
    treasure('Sea of Invocation', (k) => ({
      words: `[Knight's Creed] Reduces Cooldown by ${pct(UT.sea.cooldown)} and increases P.DMG the target takes by ${pct(k(UT.sea.takes))} for ${UT.sea.lasts} sec.`,
      skill: { index: 2, cooldownShare: 1 - UT.sea.cooldown, mark: { name: 'Sea of Invocation', takes: { physical: 1 + k(UT.sea.takes) }, lasts: UT.sea.lasts } },
    })),
    treasure('Father’s Shield', (k) => ({
      words: `[The Last Gatekeeper] Increases own M.Block by ${k(UT.shield.block)}. Upon block, the number of Endurance Stacks increases by ${UT.shield.endurance}.`,
      bonus: { blockMagical: k(UT.shield.block) },
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, cooldown: -3 } }, ({ skill }) => `Cooldown is reduced by ${-skill.cooldown} sec.`),
    's1-dark': { words: `Increases P.Weakness of the affected target by ${pct(PERKS.weakness)} for ${CUT.lasts} seconds.` },
    's2-light': said({ skill: { index: 1, cooldown: -5 } }, ({ skill }) => `Reduces Cooldown by ${-skill.cooldown} seconds.`),
    's2-dark': { words: `The shield lasts ${PERKS.longer} seconds longer.` },
    's3-light': said({ skill: { index: 2, dmg: 2 } }, ({ skill }) => `When there is 1 enemy, DMG is boosted by ${pct(skill.dmg - 1)}.`),
    's3-dark': { words: 'While in use, gains immunity to CC.' },
    's4-light': { words: `Increases the number of 'Endurance' stacked every sec by ${PERKS.each}.` },
    's4-dark': { words: `Decreases ATK Spd of the affected enemy by ${PERKS.slower.speed} for ${PERKS.slower.lasts} sec.` },
    't5-light': t5Light({ blockMagical: 200 }, ({ blockMagical }) => `M. Block +${blockMagical}`),
    't5-dark': { words: `Upon successfully blocking M.DMG, all allies have their M.Block increased by ${PERKS.ward.block} and M.DEF by ${pct(PERKS.ward.defense)} of Loman's M.DEF for ${PERKS.ward.lasts} sec. This effect is activated only once every ${PERKS.ward.every} seconds.` },
  },
  // A lunge, his halberd thrust into the boss (as written in code, whatever moves him).
  attack: 'thrust',
  join(fight, self) {
    /** Endurance's stacks, toward the next, and until a block may add one; how long the Mark of Creed lasts yet, and until it may strike again; Transcend 5's Dark's wait; his unique weapon's skills toward its next. */
    let endurance = 0;
    let enduring = 0;
    let parried = 0;
    let marked = 0;
    let markWait = 0;
    let warding = 0;
    let pride = 0;
    const tier = self.unique?.tier ?? null;

    /** A stack of Endurance more: at the most, The Last Gatekeeper strikes (through the boss's defense), and the boss's ATK is lower (its Dark: slowed too). */
    const endure = (): void => {
      endurance++;
      if (endurance < GATEKEEPER.most || self.hp <= 0) return;
      endurance = 0;
      fight.hit(self, GATEKEEPER.blow, true, 0, true);
      put(fight.foe.statuses, { name: GATE, left: GATEKEEPER.lasts, deals: 1 - GATEKEEPER.weaker, shown: 'curse' });
      if (self.perks.has('s4-dark')) fight.slow(PERKS.slower.speed, PERKS.slower.lasts);
      fight.cue(self, 'gatekeeper');
    };

    return {
      // (Cut Ground's third book: it blocks all DMG while he uses it.)
      untouched: () => self.doing?.move === 'ground',
      lands: {
        // His attack: a thrust of his halberd.
        thrust: () => fight.hit(self, fight.basic),
        // A blow, the boss knocked down, and taking more physical damage for a while (its Dark: more again).
        ground() {
          fight.hit(self, CUT.blow);
          fight.stun(CUT.down, { down: true, by: self });
          put(fight.foe.statuses, { name: CUT_DOWN, left: CUT.lasts, takes: { physical: 1 + CUT.weakness + (self.perks.has('s1-dark') ? PERKS.weakness : 0) }, shown: 'curse' });
        },
        // What the boss has left on every ally cleared, a shield on each (its Dark: for longer), none knocked down while it lasts, and all taking less.
        shroud() {
          const lasts = SHROUD.lasts + (self.perks.has('s2-dark') ? PERKS.longer : 0);
          const harmful = (status: Status<Buff>): boolean => status.shown.harmful === true && !status.binds && !status.away;
          for (let i = fight.party.length - 1; i >= 0; i--) if (harmful(fight.party[i] as Status<Buff>)) fight.party.splice(i, 1);
          const on = fight.field.filter((ally) => ally.hp > 0);
          for (const ally of on) {
            ally.statuses = ally.statuses.filter((status) => !harmful(status));
            fight.shield(ally, SHROUD.shield, lasts, self);
            put(ally.statuses, { name: SHROUDED.name, left: lasts, guards: true, shown: SHROUDED });
          }
          put(fight.party, { name: CREED_LESS.name, left: SHROUD.taken, takes: SHROUD.less, shown: CREED_LESS });
          fight.cue(self, 'shroud', on);
        },
        // Two blows that stun the boss; the last swing's two, a longer stun, and the Mark of Creed on it.
        creed(part) {
          if (part < 2) {
            fight.hit(self, CREED.blow);
            fight.stun(CREED.stun, { by: self });
            return;
          }
          fight.hit(self, CREED.last / 2);
          if (part < 3) return;
          fight.stun(CREED.lastStun, { by: self });
          marked = CREED.lasts;
          markWait = 0;
        },
      },
      // His unique weapon: every 3rd skill, a blow, the boss taking more physical damage, and his M.DEF higher.
      used() {
        if (tier === null || ++pride < GAIAMENES.skills) return;
        pride = 0;
        fight.hit(self, atTier(GAIAMENES.blow, tier), false);
        put(fight.foe.statuses, { name: ORVELIA, left: GAIAMENES.lasts, takes: { physical: 1 + atTier(GAIAMENES.weakness, tier) }, shown: 'curse' });
        put(self.statuses, { name: GAIAMENES_UP.name, left: GAIAMENES.guards, defends: { magical: 1 + atTier(GAIAMENES.defense, tier) }, shown: GAIAMENES_UP });
      },
      // The Mark of Creed: another ally's blow on the boss, a blow of his more (no sooner than half a second after the last).
      struck(by) {
        if (marked <= 0 || by === self || markWait > 0 || self.hp <= 0) return;
        markWait = CREED.every;
        fight.hit(self, CREED.mark, false);
      },
      // A block: Endurance (no sooner than a moment after the last); Transcend 5's Dark, every ally's M.Block and M.DEF higher a while.
      blocked() {
        if (parried <= 0) {
          parried = GATEKEEPER.every;
          endure();
          // (Father's Shield: more.)
          if (wearsTreasure(self, 3)) for (let i = 0; i < UT.shield.endurance; i++) endure();
        }
        if (!self.perks.has('t5-dark') || warding > 0 || fight.foe.def.stats.deals !== 'magical') return;
        warding = PERKS.ward.every;
        const defense = self.stats.magical * PERKS.ward.defense;
        for (const ally of fight.field) if (ally.hp > 0) put(ally.statuses, { name: WARDED.name, left: PERKS.ward.lasts, blocks: { magical: PERKS.ward.block }, bolsters: { magical: defense }, shown: WARDED });
      },
      tick(dt) {
        marked = Math.max(0, marked - dt);
        markWait = Math.max(0, markWait - dt);
        parried = Math.max(0, parried - dt);
        warding = Math.max(0, warding - dt);
        // Endurance every second on the field (its Light: two).
        if (!fight.field.includes(self) || self.hp <= 0) return;
        enduring += dt;
        if (enduring < 1) return;
        enduring -= 1;
        for (let i = 0; i < GATEKEEPER.each + (self.perks.has('s4-light') ? PERKS.each : 0); i++) endure();
      },
      // Knight's Creed's Dark: not to be knocked down while he swings it.
      guards: () => self.perks.has('s3-dark') && self.doing?.move === 'creed',
      lit: () => marked > 0,
      buffs: () => (endurance > 0 ? [{ ...ENDURANCE, count: endurance }] : []),
      marks: (): Mark[] => (marked > 0 ? [{ text: `Mark of Creed ${Math.ceil(marked)}s`, tone: 'curse', art: art(2), left: marked }] : []),
    };
  },
};

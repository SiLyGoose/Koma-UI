import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, treasureTier } from '../treasures';
import { MAX_MANA, SECTION } from '../rules';
import { num, pct, skillArt, type Buff } from '../shown';
import { ACRAVITA, ACRAVITA_UP, atTier } from '../unique';
import { CLASS_STATS, dmg, indexed, type HeroDef, type Passive } from './kit';
import { CODED } from './moves';

/*
 * Neraxis's skills, as the game has them (what each costs, how long before it can be used again, how long what it does
 * lasts, what Obsidian Roar adds and takes, and his passive's numbers are the game's; how hard each hits is not said
 * there). He is a knight whose blows are magical: the black dragon.
 * - Black Lightning Claw: a blow, and a second after a blow more that stuns the boss (its attacks slower: nothing here,
 *   Galgoria is steady).
 * - Obsidian Roar: every ally's ATK, P.DEF and M.DEF higher for 15 seconds; a blow, and the boss's ATK lower meanwhile.
 * - Breath of Destruction: six blows, each taking from the boss's M.DEF a moment and stunning it a moment.
 * His passive, Black Dragon Hide: his defense higher, and he takes less.
 * His unique weapon (../unique.ts) is worked here too: every so many blows of his attack a blow more that stuns the boss
 * a moment, and the Storm of Neraxis for a while (every ally's defense and ATK higher).
 * What is drawn for each is ../../heroes/neraxis/fx.ts; what his body does for each, and for his attack, ../../heroes/neraxis/moves.ts.
 *
 * His own perks (../perks.ts) are King's Raid's. Obsidian Roar's Dark does nothing here (Galgoria is steady). Black
 * Dragon Hide's Dark makes what his skills do half again as much (their blows, what Obsidian Roar adds and takes, and
 * their stuns) while he is under half his health.
 */
// (How hard each of his skills hits is the King's Raid Index's, at his class's ATK: ./kit.ts's indexed.)
/** Black Lightning Claw: its first blow and its second, and the second's stun. */
const CLAW = { blow: indexed('knight', 85_803), after: indexed('knight', 122_794), stun: 3, speed: 300, slowed: 10 };
/** Obsidian Roar: every ally's ATK and defense more, for `lasts` seconds; its blow; and the boss's ATK as much less meanwhile. */
const ROAR = { more: 13_488, lasts: 15, blow: indexed('knight', 184_295), weaker: 0.3 };
/** Breath of Destruction: its blows (as many as its move has), each taking a share of the boss's M.DEF for `lasts` seconds, and stunning it. */
const BREATH = { blow: indexed('knight', 289_536) / CODED.breath.lands.length, weaker: 0.2, lasts: 1, stun: 1 };
/** Black Dragon Hide: his P.DEF and M.DEF more, and what he takes. */
const HIDE = { defense: 18_962, taken: 0.85 };
/** His own perks' numbers: Black Lightning Claw's Light and Dark, Obsidian Roar's Light, Breath of Destruction's Dark, Black Dragon Hide's Light and Dark, and Transcend 5's Dark. */
const PERKS = { stun: 2, marked: { takes: 1.25, lasts: 10 }, roar: 2, weaker: 0.3, speed: 300, low: { below: 0.5, more: 1.5 }, guard: { taken: 0.9, lasts: 30 } };

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts): Black Lightning Claw's mana for each blow and his more
 * defense; Obsidian Roar's more DEF for every ally; Breath of Destruction's longer stun and shorter cooldown; and Black
 * Dragon Hide's mana, and every ally's block (points), every so often.
 */
const UT = {
  cartridge: { mana: 100, defense: [0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 },
  memories: { defense: [0.24, 0.29, 0.35, 0.42, 0.5] },
  vortex: { stun: 1, cooldown: [4, 5, 6, 7, 8] },
  nova: { every: 10, mana: SECTION, block: [240, 290, 350, 420, 500], lasts: 5 },
};

const art = skillArt('neraxis');

const BLACK_DRAGON_HIDE: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  taken: HIDE.taken,
  shown: { name: 'Black Dragon Hide', about: `Passive. +${num(HIDE.defense)} P.DEF and M.DEF; he takes ${pct(1 - HIDE.taken)} less.`, icon: '🐲', art: art(3) },
  words: `Increases P.DEF and M.DEF by ${num(HIDE.defense)} and takes reduced P.DMG and M.DMG by ${pct(1 - HIDE.taken)}.`,
};
/** Obsidian Roar on an ally; Transcend 5's Dark on the others. */
const ROARED: Buff = { name: 'Obsidian Roar', about: 'ATK, P.DEF and M.DEF higher.', icon: '🐉', art: art(1) };
const GUARDED: Buff = { name: 'Neraxis’s Guard', about: 'Takes less from the boss.', icon: '🐲', art: art(3) };
/** What his skills leave on the boss. */
const CLAWED = 'Black Lightning Claw';
const WEAKENED = 'Obsidian Roar';
const BREATHED = 'Breath of Destruction';

export const NERAXIS: HeroDef = {
  id: 'neraxis',
  name: 'Neraxis',
  class: 'knight',
  skins: ['Neraxis'],
  // A knight whose blows are magical, with Black Dragon Hide's defense.
  stats: { ...CLASS_STATS.knight, physical: CLASS_STATS.knight.physical + HIDE.defense, magical: CLASS_STATS.knight.magical + HIDE.defense, deals: 'magical' },
  abilities: [
    {
      name: 'Black Lightning Claw',
      about: `A blow, and a second after a blow more that stuns the boss for ${CLAW.stun} seconds.`,
      words: `Draws enemies towards the target and deals ${dmg('knight', CLAW.blow)} M.DMG. Deals ${dmg('knight', CLAW.after)} M.DMG around the target after 1 sec and stuns them for ${CLAW.stun} sec. Reduces ATK Spd of hit enemies by ${CLAW.speed} for ${CLAW.slowed} sec.`,
      icon: '⚡',
      art: art(0),
      move: 'lightning',
      cooldown: 8,
      cost: 2,
    },
    {
      name: 'Obsidian Roar',
      about: `Every ally +${num(ROAR.more)} ATK, P.DEF and M.DEF for ${ROAR.lasts} seconds; a blow, and the boss’s ATK ${pct(ROAR.weaker)} lower meanwhile.`,
      words: `Increases ATK, P.DEF, and M.DEF of all allies by ${num(ROAR.more)} for ${ROAR.lasts} sec. Deals ${dmg('knight', ROAR.blow)} M.DMG to all enemies and reduces their ATK by ${pct(ROAR.weaker)} for ${ROAR.lasts} sec.`,
      icon: '🐉',
      art: art(1),
      move: 'roar',
      cooldown: 15,
      cost: 3,
      auto: { keeps: ROARED.name },
    },
    {
      name: 'Breath of Destruction',
      about: `Six blows, each taking ${pct(BREATH.weaker)} of the boss’s M.DEF for ${BREATH.lasts} second and stunning it for ${BREATH.stun} second.`,
      words: `Deals a total of ${dmg('knight', BREATH.blow * CODED.breath.lands.length)} M.DMG to enemies within a large area around the target over 6 times and reduces their M.DEF by ${pct(BREATH.weaker)} for ${BREATH.lasts} sec. Each hit stuns the enemy for ${BREATH.stun} sec.`,
      icon: '🌋',
      art: art(2),
      move: 'breath',
      cooldown: 20,
      cost: 4,
    },
  ],
  passive: BLACK_DRAGON_HIDE,
  treasures: [
    treasure('Cartridge of Black Lightning', (k) => ({
      words: `[Black Lightning Claw] Recovers Mana by ${UT.cartridge.mana} upon each hit, and increases own P.DEF and M.DEF by ${pct(k(UT.cartridge.defense))} for ${UT.cartridge.lasts} sec.`,
      skill: { index: 0, self: { name: 'Cartridge of Black Lightning', lasts: UT.cartridge.lasts, defends: 1 + k(UT.cartridge.defense) } },
    })),
    treasure('Memories of the Blue God Dragon', (k) => ({
      words: `[Obsidian Roar] Increases DEF Boost of allies by ${pct(k(UT.memories.defense))} and dispels positive effects from all enemies upon using Obsidian Roar.`,
      skill: { index: 1, dispel: true },
    })),
    treasure('Rage Vortex', (k) => ({
      words: `[Breath of Destruction] Increases Stun duration by ${UT.vortex.stun} sec and reduces Cooldown of Breath of Destruction by ${k(UT.vortex.cooldown)} sec.`,
      skill: { index: 2, cooldown: -k(UT.vortex.cooldown) },
    })),
    treasure('Ashen Nova', (k) => ({
      words: `[Black Dragon Hide] Every ${UT.nova.every} sec, recovers 1 orb of Mana and increases All Block of all allies by ${k(UT.nova.block)} for ${UT.nova.lasts} sec.`,
    })),
  ],
  perks: {
    's1-light': { words: `Increases Stun duration by ${PERKS.stun} sec.` },
    's1-dark': said({ skill: { index: 0, mark: { name: CLAWED, takes: { magical: PERKS.marked.takes }, lasts: PERKS.marked.lasts } } }, ({ skill }) => `Increases the M.DMG that the hit enemy takes by ${pct(PERKS.marked.takes - 1)} for ${skill.mark.lasts} sec.`),
    's2-light': said({ skill: { index: 1, cost: 1 } }, ({ skill }) => `Increases Mana Cost by ${skill.cost} and ATK and DEF Boost by ${pct(PERKS.roar - 1)}.`),
    's2-dark': { words: 'Reduces ATK Spd of the hit enemy by 300 for 15 sec.' },
    's3-light': said({ skill: { index: 2, cost: -1 } }, ({ skill }) => `Reduce Mana Cost by ${-skill.cost}.`),
    's3-dark': { words: `Changes M.DEF Reduction to ${pct(PERKS.weaker)}.` },
    's4-light': { words: `ATK Spd is increased by ${PERKS.speed}` },
    's4-dark': { words: `When HP falls below ${pct(PERKS.low.below)}, skill effects are increased by ${pct(PERKS.low.more - 1)}.` },
    't5-light': t5Light({ resist: 100 }, ({ resist }) => `CC Resist +${resist}`),
    't5-dark': { words: `At the beginning of every battle, reduces DMG that non-Hero enemies deal to all allies except Neraxis by ${pct(1 - PERKS.guard.taken)} for ${PERKS.guard.lasts} sec.` },
  },
  attack: 'maw',
  // His animations: four blows, fist and foot (Ezekiel's fist fight); Obsidian Roar a battle cry.
  timing: { attack: [{ lands: [0.92, 1.52, 2.78, 3.62], until: 4.3 }], skills: { roar: { lands: [0.5], until: 2.2 } } },
  join(fight, self) {
    /** His attack's blows toward his unique weapon's next; how long its Storm lasts yet; whether Transcend 5's Dark has guarded his allies yet. */
    let blows = 0;
    let storm = 0;
    let guarded = false;
    const tier = self.unique?.tier ?? null;
    /** Toward Ashen Nova's next. */
    let nova = 0;

    /** What his skills do, as Black Dragon Hide's Dark has it: half again as much under half his health. */
    const more = (): number => (self.perks.has('s4-dark') && self.hp < self.stats.hp * PERKS.low.below ? PERKS.low.more : 1);
    /** A blow of one of his skills. */
    const blow = (amount: number): boolean => fight.hit(self, amount * more());

    /** His attack: a blow; every so many, with his unique weapon, a blow more, a stun, and the Storm of Neraxis on every ally. */
    const attack = (amount: number): void => {
      fight.hit(self, amount);
      if (tier === null || ++blows < atTier(ACRAVITA.blows, tier)) return;
      blows = 0;
      fight.hit(self, ACRAVITA.blow, false);
      fight.stun(ACRAVITA.stun, { by: self });
      storm = ACRAVITA.lasts;
      const share = atTier(ACRAVITA.defense, tier);
      for (const ally of fight.field) {
        if (ally.hp <= 0) continue;
        put(ally.statuses, { name: ACRAVITA_UP.name, left: ACRAVITA.lasts, deals: 1 + atTier(ACRAVITA.atk, tier), bolsters: { physical: self.stats.physical * share, magical: self.stats.magical * share }, shown: ACRAVITA_UP });
      }
      fight.cue(self, 'storm', fight.field);
    };

    return {
      lands: {
        // His attack: a blow of his dragon's claw, as written in code; or as his animation for it has it.
        maw: () => attack(fight.basic),
        attack: () => attack(fight.basic),
        // A blow; a second after, a blow more and the boss stunned (its Light: for longer), and slowed (it is steady).
        lightning(part) {
          blow(part === 0 ? CLAW.blow : CLAW.after);
          // (Cartridge of Black Lightning: mana for each.)
          if (treasureTier(self, 0) > 0) self.mana = Math.min(MAX_MANA, self.mana + UT.cartridge.mana);
          if (part === 0) return;
          fight.stun((CLAW.stun + (self.perks.has('s1-light') ? PERKS.stun : 0)) * more(), { by: self });
          fight.slow(CLAW.speed, CLAW.slowed);
        },
        // Every ally's ATK and defense higher (its Light: twice as much), a blow, and the boss's ATK lower (its Dark: slowed too).
        roar() {
          const boost = ROAR.more * (self.perks.has('s2-light') ? PERKS.roar : 1) * more();
          // (Memories of the Blue God Dragon: more of its DEF.)
          const defense = boost * (1 + fromTreasure(self, 1, UT.memories.defense));
          const on = fight.field.filter((ally) => ally.hp > 0);
          for (const ally of on) put(ally.statuses, { name: ROARED.name, left: ROAR.lasts, deals: 1 + boost / ally.stats.atk, bolsters: { physical: defense, magical: defense }, shown: ROARED });
          fight.cue(self, 'roar', on);
          blow(ROAR.blow);
          put(fight.foe.statuses, { name: WEAKENED, left: ROAR.lasts, deals: Math.max(0, 1 - ROAR.weaker * more()), shown: 'curse' });
          if (self.perks.has('s2-dark')) fight.slow(300, ROAR.lasts);
        },
        // A blow that takes from the boss's M.DEF a moment (its Dark: more) and stuns it a moment.
        breath() {
          const weaker = (self.perks.has('s3-dark') ? PERKS.weaker : BREATH.weaker) * more();
          put(fight.foe.statuses, { name: BREATHED, left: BREATH.lasts, defends: { magical: Math.max(0, 1 - weaker) }, shown: 'curse' });
          blow(BREATH.blow);
          // (Rage Vortex: for longer.)
          fight.stun((BREATH.stun + (treasureTier(self, 2) > 0 ? UT.vortex.stun : 0)) * more(), { by: self });
        },
      },
      tick(dt) {
        storm = Math.max(0, storm - dt);
        // Ashen Nova: every so often, mana, and every ally's block higher a moment.
        const block = fromTreasure(self, 3, UT.nova.block);
        if (block > 0 && self.hp > 0 && fight.field.includes(self)) {
          nova += dt;
          if (nova >= UT.nova.every) {
            nova -= UT.nova.every;
            self.mana = Math.min(MAX_MANA, self.mana + UT.nova.mana);
            for (const ally of fight.field) if (ally.hp > 0) put(ally.statuses, { name: 'Ashen Nova', left: UT.nova.lasts, blocks: { physical: block, magical: block }, shown: { name: 'Ashen Nova', about: `+${block} block.`, icon: '🐲', art: art(3) } });
          }
        }
        // Transcend 5's Dark: as the fight begins, every ally but him takes less for a while.
        if (guarded || !self.perks.has('t5-dark')) return;
        guarded = true;
        for (const ally of fight.fighters) if (ally !== self) put(ally.statuses, { name: GUARDED.name, left: PERKS.guard.lasts, takes: PERKS.guard.taken, shown: GUARDED });
      },
      speed: () => (self.perks.has('s4-light') ? PERKS.speed : 0),
      lit: () => storm > 0,
      buffs: () => (storm > 0 ? [{ ...ACRAVITA_UP, left: storm }] : []),
    };
  },
};


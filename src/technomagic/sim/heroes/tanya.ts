import { share } from '../combat/damage';
import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { MAX_MANA } from '../rules';
import { pct, skillArt, stateArt, type Buff, type Mark } from '../shown';
import { atTier, CAETHASIS, CAETHASIS_UP } from '../unique';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, indexed, type Passive } from './kit';
import { CODED } from './moves';

/*
 * Tanya's skills, as the game has them (what each costs, how long before it can be used again, how long what it does
 * lasts, and Stealth's numbers are the game's; how hard each hits, how long Target Sighted knocks the boss down and
 * leaves it exposed, and what a stack of Bleed does are not said there). She is an assassin of the Laughing Mask.
 * Each of her skills puts her in Stealth (10 seconds: her crit chance and dodge higher), or, used in it, does more:
 * - Target Sighted: the boss takes more physical damage for a while; a blow that knocks it down (in Stealth: stunned).
 * - Blade Tornado: three blows, each a stack of Bleed on the boss (in Stealth: it is healed far less for a while, and
 *   her Stealth is spent).
 * - Whisper of Death: six blows and a seventh (in Stealth: what is on the boss for it is dispelled; nothing here).
 * Her passive, Silent Ambush: a critical blow of a skill of hers deals more (and silences: nothing here, the boss casts
 * nothing that can be cut short); and on the boss, not a Hero, a blow more through its defense (and slows it: nothing,
 * it is steady).
 * Her unique weapon (../unique.ts) is worked here too: in Stealth from the start and untouched for a moment, her crit
 * damage higher while she is in Stealth.
 * What is drawn for each is ../../heroes/tanya/fx.ts; what her body does for each, and for her attack, ../../heroes/tanya/moves.ts.
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Target
 * Sighted's Dark lowers the boss's P.Crit Resistance (its blows likelier critical), but makes nothing of it a Priest (the
 * boss has no class); Blade Tornado's Light, and Needle of Silence's mana off the target, do nothing here (the boss has no
 * mana), nor Silent Ambush's Dark (no silence).
 */
// (How hard each of her skills hits is the King's Raid Index's, at her class's ATK: ./kit.ts's indexed.)
/** Stealth: how long, her crit chance and dodge (points) more meanwhile. */
const STEALTH = { lasts: 10, crit: 50, dodge: 50 };
/** Target Sighted: how much more physical damage the boss takes for `lasts` seconds, its blow, how long the boss is down, and (in Stealth) stunned. */
const SIGHTED = { takes: 1.3, lasts: 10, blow: indexed('assassin', 119_110), down: 2, stun: 6 };
/** Blade Tornado: its blows (as many as its move has), each a stack of Bleed; in Stealth, the boss's healing as much as `heals` for `lasts` seconds. */
const TORNADO = { blow: indexed('assassin', 247_062) / CODED.tornado.lands.length, heals: 0.3, lasts: 10 };
/** A stack of Bleed: what it takes of the boss every second (at her ATK), for `lasts` seconds. */
const BLEED = { each: 470, lasts: 5 };
/** Whisper of Death: its six blows, and its last. */
const WHISPER = { blow: indexed('assassin', 841_890) / (CODED.whisper.lands.length - 1), last: indexed('assassin', 264_085) };
/** Silent Ambush: a critical blow of a skill deals more (at ATK); on the boss, a blow more through its defense. */
const AMBUSH = { blow: indexed('assassin', 61_307), boss: indexed('assassin', 42_824), speed: 200, slowed: 10 };
/** Her own perks' numbers: Target Sighted's Light and Dark (the boss's P.Crit Resistance lower, points, for `lasts` seconds), Blade Tornado's Dark, Silent Ambush's Light, and Transcend 5's Dark. */
const PERKS = { heals: 0.7, critTaken: 250, lasts: 10, mana: 200, boss: 2, stealth: { chance: 0.15, more: 1.5 } };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts): Target Sighted's DMG and mana; Blade Tornado's DMG and the
 * share off its cooldown on a critical blow; Whisper of Death's DMG, and her ATK for it used in Stealth; and Silent
 * Ambush's mana for her, and the mana it would take (the boss has none).
 */
const UT = {
  codex: { dmg: 0.5, mana: [400, 480, 580, 700, 840, 1000] },
  mask: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], cooldown: 0.08 },
  dagger: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], atk: 0.2, lasts: 10 },
  needle: { mana: [100, 120, 140, 170, 210, 250], drain: 200 },
};

const art = skillArt('tanya');

const SILENT_AMBUSH: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Silent Ambush',
    about: `Passive. A critical blow of a skill of hers deals ${pct(AMBUSH.blow / 1000)} of her ATK more, and ${pct(AMBUSH.boss / 1000)} more through the boss’s defense.`,
    icon: '🗡️',
    art: art(3),
  },
  words: `Deals additional ${dmg('assassin', AMBUSH.blow, bookDmg('tanya', 3))} P.DMG to the enemy and silences them for 1 sec upon a Critical Hit with the skill. If the target is not a Hero, deals additional ${dmg('assassin', AMBUSH.boss, bookDmg('tanya', 3))} P.DMG that ignores DEF and reduces the target's ATK Spd by ${AMBUSH.speed} for ${AMBUSH.slowed} sec.`,
};
/** Stealth on her; Bleed on the boss. */
const STEALTHED: Buff = { name: 'Stealth', about: `+${STEALTH.crit} crit chance and +${STEALTH.dodge} dodge.`, icon: '🌫️', art: art(0) };
const BLED = 'Bleed';
/** What her skills leave on the boss. */
const EXPOSED = 'Target Sighted';
const UNHEALED = 'Target Sighted (healing)';
const TORN = 'Blade Tornado';

export const TANYA: HeroDef = {
  id: 'tanya',
  name: 'Tanya',
  class: 'assassin',
  skins: ['Tanya'],
  // An assassin (her blows physical): as her class stands.
  stats: { ...CLASS_STATS.assassin, deals: 'physical' },
  abilities: [
    {
      name: 'Target Sighted',
      about: `The boss takes ${pct(SIGHTED.takes - 1)} more physical damage for ${SIGHTED.lasts} seconds; a blow that knocks it down (in Stealth: stunned for ${SIGHTED.stun} seconds; else, Stealth).`,
      words: `Moves behind the enemy with the lowest P.DEF and increase their P.DMG taken by ${pct(SIGHTED.takes - 1)}, while knocking them down and inflicting ${dmg('assassin', SIGHTED.blow, bookDmg('tanya', 0))} P.DMG. If in a Stealth state, stun said enemy for ${SIGHTED.stun} sec. If not, gain Stealth for ${STEALTH.lasts} sec. While in a Stealth State, Crit Rate and Dodge Rate rises by ${STEALTH.crit}.`,
      icon: '🎯',
      art: art(0),
      move: 'sighted',
      cooldown: 8,
      cost: 2,
    },
    {
      name: 'Blade Tornado',
      about: `Three blows, each a stack of Bleed on the boss (in Stealth: it is healed ${pct(1 - TORNADO.heals)} less for ${TORNADO.lasts} seconds, her Stealth spent; else, Stealth).`,
      words: `Attacks nearby enemies 3 times and deals a total of ${dmg('assassin', TORNADO.blow * CODED.tornado.lands.length, bookDmg('tanya', 1))} P.DMG, inflicting 1 stack of Bleed per each hit. If used in a Stealth state, target's heal rate is reduced by ${pct(1 - TORNADO.heals)}, and Stealth is dispelled. If not, turns into Stealth mode for ${STEALTH.lasts} sec. [Stealth] Crit Rate and Dodge Rate are increased by ${STEALTH.crit}.`,
      icon: '🌪️',
      art: art(1),
      move: 'tornado',
      cooldown: 14,
      cost: 2,
    },
    {
      name: 'Whisper of Death',
      about: 'Six blows and a seventh (out of Stealth: Stealth).',
      words: `Attacks random enemies 6 times and deals a total of ${dmg('assassin', WHISPER.blow * (CODED.whisper.lands.length - 1), bookDmg('tanya', 2))} P.DMG, then deals one additional attack of ${dmg('assassin', WHISPER.last, bookDmg('tanya', 2))} extra P.DMG. If used in Stealth state, dispels all enemies' buffs. If not, turns into Stealth mode for ${STEALTH.lasts} sec. [Stealth] Crit Rate and Dodge Rate are increased by ${STEALTH.crit}.`,
      icon: '💀',
      art: art(2),
      move: 'whisper',
      cooldown: 18,
      cost: 3,
    },
  ],
  passive: SILENT_AMBUSH,
  treasures: [
    treasure('Copied Codex of Stealth', (k) => ({
      words: `[Target Sighted] Increases DMG by ${pct(UT.codex.dmg)}, and after use, recovers Mana by ${k(UT.codex.mana)}.`,
      skill: { index: 0, dmg: 1 + UT.codex.dmg, mana: k(UT.codex.mana) },
    })),
    treasure('Laughing Mask All-round Belt', (k) => ({
      words: `[Blade Tornado] Increases DMG by ${pct(k(UT.mask.dmg))} and reduces Cooldown by ${pct(UT.mask.cooldown)} upon a Crit Hit.`,
      skill: { index: 1, dmg: 1 + k(UT.mask.dmg), critCooldown: UT.mask.cooldown },
    })),
    treasure('Dagger of Silence', (k) => ({
      words: `[Whisper of Death] Increases DMG by ${pct(k(UT.dagger.dmg))}. Upon use, immediately gains Stealth. If used during Stealth state, increases ATK by ${pct(UT.dagger.atk)} for ${UT.dagger.lasts} sec.`,
      skill: { index: 2, dmg: 1 + k(UT.dagger.dmg) },
    })),
    treasure('Needle of Silence', (k) => ({
      words: `[Silent Ambush] Upon activation, recovers own Mana by ${k(UT.needle.mana)} while reducing the target's Mana by ${UT.needle.drain}.`,
    })),
  ],
  perks: {
    's1-light': { words: `Reduces the target's Heal Rate by ${pct(1 - PERKS.heals)}.` },
    's1-dark': said(
      { skill: { index: 0, mark: { name: 'Target Sighted (crit)', lasts: PERKS.lasts, critTaken: { physical: PERKS.critTaken } } } },
      ({ skill }) => `Changes the target to Priest, and reduces target's P.Crit Resistance by ${PERKS.critTaken} for ${skill.mark.lasts} sec.`,
    ),
    's2-light': { words: "Each hit reduces the target's Mana by 300." },
    's2-dark': { words: `Recovers ${PERKS.mana} mana upon a Crit hit.` },
    's3-light': said({ skill: { index: 2, cost: 1, dmg: 2 } }, ({ skill }) => `Mana cost is increased by ${skill.cost} orb but DMG is boosted by ${pct(skill.dmg - 1)}.`),
    's3-dark': said({ skill: { index: 2, cost: -1 } }, ({ skill }) => `Reduces Mana Cost by ${-skill.cost}.`),
    's4-light': { words: `Increases additional DMG against non-Hero enemies by ${pct(PERKS.boss - 1)}.` },
    's4-dark': { words: 'Increases Silence duration by 0.5 sec.' },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': { words: `Normal attacks have a ${pct(PERKS.stealth.chance)} chance to activate Stealth mode that lasts for ${STEALTH.lasts} sec. While in Stealth mode, normal attacks deal ${pct(PERKS.stealth.more - 1)} increased DMG.` },
  },
  attack: 'katar',
  // Her animations: four blows, fist and foot (Ezekiel's fist fight), her katars on her fists.
  timing: { attack: [{ lands: [0.92, 1.52, 2.78, 3.62], until: 4.3 }] },
  join(fight, self) {
    /** How long her Stealth lasts yet; how long the boss can't touch her yet (her unique weapon); whether it has hidden her as the fight begins; Bleed's stacks on the boss (how long each lasts yet), and toward their next bite. */
    let stealth = 0;
    let untouched = 0;
    let begun = false;
    const bleeds: number[] = [];
    let bleeding = 0;
    const tier = self.unique?.tier ?? null;

    /** In Stealth for a while: her crit chance higher; her dodge (dodge, below). With her unique weapon, her crit damage higher for a while as she goes into it. */
    const hide = (): void => {
      stealth = STEALTH.lasts;
      put(self.statuses, { name: STEALTHED.name, left: STEALTH.lasts, crit: share(STEALTH.crit), shown: STEALTHED });
      if (tier !== null) put(self.statuses, { name: CAETHASIS_UP.name, left: CAETHASIS.boosted, critDamage: atTier(CAETHASIS.critDamage, tier), shown: CAETHASIS_UP });
      fight.cue(self, 'stealth');
    };
    /** Her Stealth spent. */
    const unhide = (): void => {
      stealth = 0;
      self.statuses = self.statuses.filter((status) => status.name !== STEALTHED.name);
    };
    /** A blow of one of her skills: a critical one, Silent Ambush (a blow more, and one through the boss's defense: its Light, twice as hard); Blade Tornado's Dark, mana. */
    const skill = (amount: number, tornado = false): void => {
      const critical = fight.hit(self, amount);
      if (!critical) return;
      fight.hit(self, AMBUSH.blow, false);
      // (Needle of Silence: mana.)
      self.mana = Math.min(MAX_MANA, self.mana + fromTreasure(self, 3, UT.needle.mana));
      fight.hit(self, AMBUSH.boss * (self.perks.has('s4-light') ? PERKS.boss : 1), false, 0, true);
      fight.slow(AMBUSH.speed, AMBUSH.slowed);
      if (tornado && self.perks.has('s2-dark')) self.mana = Math.min(MAX_MANA, self.mana + PERKS.mana);
    };
    /** Her attack: a blow (Transcend 5's Dark: harder in Stealth, and now and then Stealth). */
    const attack = (amount: number): void => {
      const dark = self.perks.has('t5-dark');
      fight.hit(self, amount * (dark && stealth > 0 ? PERKS.stealth.more : 1));
      if (dark && stealth <= 0 && fight.roll() < PERKS.stealth.chance) hide();
    };

    return {
      lands: {
        // Her attack: a cut of each katar, as written in code; or as her animation for it has it.
        katar: () => attack(fight.basic),
        attack: () => attack(fight.basic),
        // The boss exposed, a blow that knocks it down; in Stealth, stunned; else, Stealth. Its Light: the boss healed less.
        sighted() {
          const hidden = stealth > 0;
          put(fight.foe.statuses, { name: EXPOSED, left: SIGHTED.lasts, takes: { physical: SIGHTED.takes }, shown: 'curse' });
          if (self.perks.has('s1-light')) put(fight.foe.statuses, { name: UNHEALED, left: SIGHTED.lasts, heals: PERKS.heals, shown: 'curse' });
          skill(SIGHTED.blow);
          fight.stun(SIGHTED.down, { down: true, by: self });
          if (hidden) fight.stun(SIGHTED.stun, { by: self });
          else hide();
        },
        // A blow and a stack of Bleed; as the last lands, in Stealth: the boss healed far less, her Stealth spent; else, Stealth.
        tornado(part) {
          skill(TORNADO.blow, true);
          bleeds.push(BLEED.lasts);
          if (part < (self.motion.moves.tornado.parts[0]?.lands.length ?? 1) - 1) return;
          if (stealth > 0) {
            put(fight.foe.statuses, { name: TORN, left: TORNADO.lasts, heals: TORNADO.heals, shown: 'curse' });
            unhide();
          } else hide();
        },
        // Six blows and a seventh; out of Stealth, Stealth as the last lands (in it, there is nothing on the boss to dispel).
        whisper(part) {
          const last = (self.motion.moves.whisper.parts[0]?.lands.length ?? 1) - 1;
          skill(part === last ? WHISPER.last : WHISPER.blow);
          if (part === last && stealth <= 0) hide();
        },
      },
      // Dagger of Silence: Whisper of Death used in Stealth, her ATK higher a while; and Stealth at once.
      used(index) {
        if (index !== 2 || !wearsTreasure(self, 2)) return;
        if (stealth > 0) put(self.statuses, { name: 'Dagger of Silence', left: UT.dagger.lasts, atk: UT.dagger.atk, shown: { name: 'Dagger of Silence', about: `ATK ${pct(UT.dagger.atk)} higher.`, icon: '🗡️', art: art(2) } });
        hide();
      },
      tick(dt) {
        // Her unique weapon: in Stealth as the fight begins, and untouched for a moment.
        if (!begun && tier !== null) {
          begun = true;
          hide();
          untouched = atTier(CAETHASIS.untouched, tier);
        }
        stealth = Math.max(0, stealth - dt);
        untouched = Math.max(0, untouched - dt);
        // Bleed: every second, what each stack takes of the boss.
        for (let i = bleeds.length - 1; i >= 0; i--) {
          bleeds[i] = (bleeds[i] as number) - dt;
          if ((bleeds[i] as number) <= 0) bleeds.splice(i, 1);
        }
        if (bleeds.length === 0) {
          bleeding = 0;
          return;
        }
        bleeding += dt;
        if (bleeding < 1) return;
        bleeding -= 1;
        fight.hit(self, BLEED.each * bleeds.length, false);
      },
      untouched: () => untouched > 0,
      dodge: () => (stealth > 0 ? STEALTH.dodge : 0),
      lit: () => stealth > 0,
      marks: (): Mark[] => (bleeds.length > 0 ? [{ text: `${BLED} ×${bleeds.length}`, tone: 'curse', art: stateArt('Bleeding'), count: String(bleeds.length) }] : []),
    };
  },
};


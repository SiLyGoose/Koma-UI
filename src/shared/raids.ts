/*
 * The raids played with heroes, as the site says them: the TechnoMagic Raid's bosses and the Dragon Raid's dragons (King's
 * Raid's Fire, Frost, Poison and Black Dragons). For the front page's Raid Lists (../hub/raid-list.ts) and each raid's
 * Raid Info (../technomagic/prep/prep.ts). What each does in a fight is the sim's (../technomagic/sim/bosses/<boss>/); this
 * is only its words, kept apart so the front page reads none of it. A new boss: a card in its raid's list, and its banner.
 */

/** Something a win gives, as its icon: zeiucoins (points), komaGems, a kind of hero essence (null: one rolled each win), or gear (by its slot's icon). */
export type RaidReward =
  | { kind: 'points' }
  | { kind: 'gems' }
  | { kind: 'essence'; id: string | null }
  | { kind: 'gear'; slot: 'weapon' | 'armor'; name: string }
  /** TechnoMagic gear: a set's pieces, drawn as a TM card of whichever class. */
  | { kind: 'tm'; slot: 'weapon' | 'armor'; name: string };

export interface RaidCard {
  /** Its id, as the bot and the raid's page know it (?boss=). */
  id: string;
  name: string;
  /** What its raid is called (King's Raid's name for it), and where it is fought. */
  title: string;
  lair: string;
  /** What it does, in a line. */
  about: string;
  /** How to beat it, as King's Raid's Raid Info says it (its Characteristics: the game's tip, told of the raid's boss). */
  tactic: string;
  /** What a win against it gives. */
  rewards: readonly RaidReward[];
}

/** A boss still to come to a raid: on its Raid List under the others, with its banner, but not yet to be fought. */
export type UpcomingCard = Pick<RaidCard, 'id' | 'name' | 'title'>;

/** A raid's list: the game it opens, its line under the heading, the line under each boss's rewards, its bosses, and those to come. */
export interface RaidList {
  game: 'technomagic' | 'dragon';
  tip: string;
  rewardNote: string;
  cards: readonly RaidCard[];
  upcoming?: readonly UpcomingCard[];
}

const POINTS: RaidReward = { kind: 'points' };
const HERO_GEAR: RaidReward = { kind: 'gear', slot: 'armor', name: 'Hero gear' };
const GEMS: RaidReward = { kind: 'gems' };

export const TM_LIST: RaidList = {
  game: 'technomagic',
  tip: 'Every win gives TechnoMagic gear of the boss’s own set, runes and zeiucoins, and komaGems the first time you clear a stage. There is no daily limit.',
  rewardNote: 'TechnoMagic gear of its set (1 piece at stages 1–4, 2 at 5–7, 3 at 8–9, each with its options and an additional effect), runes (better from the start than a dragon’s), and now and then an artifact. komaGems, the first time a stage is cleared: 5 at stages 1–3, 10 at 4–6, 20 at 7–9.',
  cards: [
    {
      id: 'galgoria',
      name: 'Galgoria',
      title: 'TechnoMagic Raid',
      lair: 'a grey wasteland',
      about:
        'Galgoria, a chimera of three heads that spits venom. Its blows are magical, nothing slows it, and it heals itself all the while. Every 150 blows the hero that has dealt the most is shut in the swamp, and its Swamp Destroyer knocks every hero down.',
      tactic:
        'As all of Galgoria’s attacks deal M.DMG and it recovers HP all the while, you should try using Heroes that have M.DEF-related spells and Heroes that reduce its healing. Since [Swamp Imprisonment] shuts away the Hero that has dealt the most DMG, your party should not rely on a single Hero.',
      rewards: [POINTS, GEMS, { kind: 'tm', slot: 'weapon', name: 'Perseverance Set' }],
    },
    {
      id: 'siegfried',
      name: 'Siegfried',
      title: 'TechnoMagic Raid',
      lair: 'the sanctuary of Serineu',
      about:
        'Siegfried, the King of Dawn, corrupted. His blows are physical and break shields, he blocks every kind of blow, and nothing slows him or lowers his DEF. As he would be beaten he rises again, twice, whole and stronger, his sword reaching further each time; his mana full, his blows see through DEF.',
      tactic:
        'Distorted Dawn, Siegfried can revive 2 times if he is close to death. Every time he comes back from death, the power within his sword becomes stronger. In his final state, the aura of his sword becomes so big that it even threatens the Heroes in the backline, so make sure to protect your Heroes located in the back! Oh, and all of Siegfried’s attacks destroy Shields and become even stronger when his Mana is full! Make sure his Mana doesn’t reach the max capacity!',
      rewards: [POINTS, GEMS, { kind: 'tm', slot: 'weapon', name: 'Hope Set' }],
    },
  ],
  upcoming: [{ id: 'ascalon', name: 'Ascalon', title: 'TechnoMagic Raid' }],
};

export const DRAGON_LIST: RaidList = {
  game: 'dragon',
  tip: 'Every win gives the dragon’s own set’s gear, runes, zeiucoins, and its hero essences, more at each stage, and komaGems the first time you beat a stage. There is no daily limit.',
  rewardNote: 'Hard: its set’s gear, T6 at stages 1–3, T7 at 4–7 and T8 at 8–10, more pieces at each stage; and runes, better from stage to stage. Normal: a T6 piece from stage 7, and from stage 13 as much as the Hard stage it is as tough as. Every stage pays more. komaGems, the first time a stage is beaten: Normal 1 at stages 1–6, 2 at 7–12, 3 at 13–19, 4 at 20; Hard 3 at stages 1–4, 5 at 5–7, 10 at 8–10.',
  cards: [
    {
      id: 'temeraire',
      name: 'Temeraire',
      title: 'Fire Dragon',
      lair: 'Dragia, the mountain of red lava',
      about:
        'Temeraire, the ancient red dragon of fire. All its blows are magical, and it blocks physical damage. Its Blessing of the Flame has it hit 50% harder and take 60% less physical damage until your heroes land 150 blows on it; its Flame Breath leaves them burning.',
      tactic:
        'As all of Temeraire’s attacks deal massive M.DMG, you should try using Heroes that have M.DEF-related spells. To remove [Blessing of the Flame] from Temeraire, Heroes that have high hit counts are recommended. Also, since Temeraire shrugs off most P.DMG, you should form a party with Heroes that mainly deal M.DMG.',
      rewards: [POINTS, { kind: 'essence', id: 'force' }, { kind: 'essence', id: 'justice' }, GEMS, HERO_GEAR],
    },
    {
      id: 'scalaxia',
      name: 'Scalaxia',
      title: 'Frost Dragon',
      lair: 'Turandana, the land of ice',
      about: 'Scalaxia, the ancient blue dragon of ice. Its blows are magical, and each leaves Frost: ten of it freeze a hero. Its Glacial Storm freezes every hero and drains their mana.',
      tactic:
        'As Scalaxia’s every hit inflicts Frost and 10 stacks of it freeze a Hero, you should try using Heroes who are immune to CC and Heroes with dispel spells. Also, since Scalaxia takes less M.DMG and blocks most of it, you should form your party with Heroes that mainly deal P.DMG.',
      rewards: [POINTS, { kind: 'essence', id: 'wisdom' }, { kind: 'essence', id: 'patience' }, GEMS, HERO_GEAR],
    },
    {
      id: 'zyrrkinoth',
      name: 'Zyrrkinoth',
      title: 'Poison Dragon',
      lair: 'Grimvine, the swamp of death',
      about:
        'Zyrrkinoth, the ancient green venomous dragon. Its blows are physical, and each leaves Poison: thirty of it turn a hero to stone. Its Toxic Scales shrug off crits and damage, but every crit it takes cracks them, and nothing slows it.',
      tactic:
        'As Zyrrkinoth deals massive DMG by continuously inflicting stacks of Poison, you will need constant healing, and dispel spells before 30 stacks turn a Hero to stone. Also, since its wyrms join the fight once it flies off, you should try using Heroes that deal DMG in a wide area. To crack its [Toxic Scales], which reduce Crit Chance against it, you should form your party with Heroes that mainly have high Crit Chance.',
      rewards: [POINTS, { kind: 'essence', id: 'fortune' }, { kind: 'essence', id: 'strategy' }, GEMS, HERO_GEAR],
    },
    {
      id: 'armarta',
      name: 'Armarta',
      title: 'Black Dragon',
      lair: 'Ashen Nox, the Black Sun',
      about:
        'Armarta, the ancient black dragon. Its blows are physical. Its Black Flame Breath leaves the Dark Flames (they burn, and cut healing), its Stone Gaze turns whoever has dealt the most to stone, and after three of its skills its Ashen Eclipse hits those in its flames the hardest.',
      tactic:
        'As [Black Flame Breath] leaves [Dark Flame], which burns your Heroes and cuts the healing they receive, you should try using Heroes with dispel spells. [Stone Gaze] turns the Hero that has dealt the most DMG to stone, so your party should not rely on a single Hero. Also, since [Dragon Fury] deals devastating P.DMG to your entire party, more to those in [Dark Flame], and grows stronger each time, you should try using Heroes that have P.DEF-related spells.',
      rewards: [POINTS, { kind: 'essence', id: 'harmony' }, { kind: 'essence', id: null }, GEMS, HERO_GEAR],
    },
  ],
};

/** A boss's card, whichever raid it is in (none: no such boss). */
export const raidCard = (id: string): RaidCard | undefined => [...TM_LIST.cards, ...DRAGON_LIST.cards].find((card) => card.id === id);

/** A boss's banner for the Raid List: its head, cut out (public/technomagic/banners/, rendered from its model). */
export const raidBanner = (id: string): string => `/technomagic/banners/${id}.webp`;

/*
 * The raids played with heroes, as the site says them: the TechnoMagic Raid's bosses and the Dragon Raid's dragons (King's
 * Raid's Fire, Frost, Poison and Black Dragons). For the front page's Raid Lists (../hub/raid-list.ts) and each raid's
 * Raid Info (../technomagic/prep/prep.ts). What each does in a fight is the sim's (../technomagic/sim/bosses/<boss>/); this
 * is only its words, kept apart so the front page reads none of it. A new boss: a card in its raid's list, and its banner.
 */

/** Something a win gives, as its icon: zeiucoins (points), a kind of hero essence (null: one rolled each win), or gear (by its slot's icon). */
export type RaidReward =
  | { kind: 'points' }
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

export const TM_LIST: RaidList = {
  game: 'technomagic',
  tip: 'Every win gives TechnoMagic gear of the boss’s own set, and zeiucoins. There is no daily limit.',
  rewardNote: 'TechnoMagic gear: 3 pieces at stages 1–3, 4 at stages 4–6 and 5 at stages 7–8, each with its potentials and an additional skill.',
  cards: [
    {
      id: 'galgoria',
      name: 'Galgoria',
      title: 'TechnoMagic Raid',
      lair: 'a grey wasteland',
      about:
        'Galgoria, a chimera of three heads that spits venom. Its blows are magical, nothing slows it, and it heals itself all the while. Every 150 blows the hero that has dealt the most is shut in the swamp, and its Swamp Destroyer knocks every hero down.',
      rewards: [POINTS, { kind: 'tm', slot: 'weapon', name: 'Perseverance Set' }],
    },
  ],
  upcoming: [{ id: 'siegfried', name: 'Siegfried', title: 'TechnoMagic Raid' }],
};

export const DRAGON_LIST: RaidList = {
  game: 'dragon',
  tip: 'Every win gives hero gear, zeiucoins and the dragon’s hero essences, more at each stage. There is no daily limit.',
  rewardNote: 'Hero gear is raid items (T3, and T4 from stage 5). Every stage pays more.',
  cards: [
    {
      id: 'temeraire',
      name: 'Temeraire',
      title: 'Fire Dragon',
      lair: 'Dragia, the mountain of red lava',
      about:
        'Temeraire, the ancient red dragon of fire. All its blows are magical, and it blocks physical damage. Its Blessing of the Flame has it hit 50% harder and take 60% less physical damage until your heroes land 150 blows on it; its Flame Breath leaves them burning.',
      rewards: [POINTS, { kind: 'essence', id: 'force' }, { kind: 'essence', id: 'justice' }, HERO_GEAR],
    },
    {
      id: 'scalaxia',
      name: 'Scalaxia',
      title: 'Frost Dragon',
      lair: 'Turandana, the land of ice',
      about: 'Scalaxia, the ancient blue dragon of ice. Its blows are magical, and each leaves Frost: ten of it freeze a hero. Its Glacial Storm freezes every hero and drains their mana.',
      rewards: [POINTS, { kind: 'essence', id: 'wisdom' }, { kind: 'essence', id: 'patience' }, HERO_GEAR],
    },
    {
      id: 'zyrrkinoth',
      name: 'Zyrrkinoth',
      title: 'Poison Dragon',
      lair: 'Grimvine, the swamp of death',
      about:
        'Zyrrkinoth, the ancient green venomous dragon. Its blows are physical, and each leaves Poison: thirty of it turn a hero to stone. Its Toxic Scales shrug off crits and damage, but every crit it takes cracks them, and nothing slows it.',
      rewards: [POINTS, { kind: 'essence', id: 'fortune' }, { kind: 'essence', id: 'strategy' }, HERO_GEAR],
    },
    {
      id: 'armarta',
      name: 'Armarta',
      title: 'Black Dragon',
      lair: 'Ashen Nox, the Black Sun',
      about:
        'Armarta, the ancient black dragon. Its blows are magical. Its Black Flame Breath leaves the Dark Flames (they burn, and cut healing), its Stone Gaze turns whoever has dealt the most to stone, and after three of its skills its Ashen Eclipse hits those in its flames the hardest.',
      rewards: [POINTS, { kind: 'essence', id: 'harmony' }, { kind: 'essence', id: null }, HERO_GEAR],
    },
  ],
};

/** A boss's card, whichever raid it is in (none: no such boss). */
export const raidCard = (id: string): RaidCard | undefined => [...TM_LIST.cards, ...DRAGON_LIST.cards].find((card) => card.id === id);

/** A boss's banner for the Raid List: its head, cut out (public/technomagic/banners/, rendered from its model). */
export const raidBanner = (id: string): string => `/technomagic/banners/${id}.webp`;

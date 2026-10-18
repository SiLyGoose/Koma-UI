// Made by KR-extracted/scripts/tm-heroes.mjs from King's Raid's CBT2 playtest's tables: don't edit it.
import type { Span } from '../motion';

/*
 * What King's Raid's playtest has for each hero that the fight takes as it is: its mana (what it recovers a second, and
 * gains as each part of its attack lands), how long it waits between one attack and the next (seconds), its attack: the
 * parts of its chain, one after another, each with when its blows land on its target (seconds in), how hard each is
 * (thousandths of ATK), and when it is over; and its skills' books, all of them (its skills here are as they are with them):
 * how much more each skill's damage, and its heals and shields, are for them (a share: its 3 skills, then its passive).
 */
export interface KrHero {
  mana: { regen: number; attack: number };
  wait: number;
  attack: readonly (Span & { blows: readonly number[] })[];
  books: { dmg: readonly number[]; heal: readonly number[] };
}

export const KR_HEROES: Readonly<Record<string, KrHero>> = {
  annette: { mana: { regen: 75, attack: 425 }, wait: 0.3, attack: [{ lands: [1, 1.2, 1.4], blows: [800, 800, 800], until: 1.7 }], books: { dmg: [0.25, 0, 0.25, 0.25], heal: [0, 0.25, 0, 0] } },
  crow: { mana: { regen: 75, attack: 450 }, wait: 0, attack: [{ lands: [0.9], blows: [2600], until: 1.8 }], books: { dmg: [0.5, 0.5, 0.5, 0.5], heal: [0, 0, 0, 0] } },
  'dark-lord-kasel': { mana: { regen: 75, attack: 0 }, wait: 0, attack: [{ lands: [0.3, 0.8], blows: [700, 700], until: 1.3 }, { lands: [0.3, 0.4], blows: [700, 700], until: 1.1 }, { lands: [0.7], blows: [700], until: 2.3 }], books: { dmg: [0.5, 0.5, 0.5, 0.5], heal: [0, 0, 0, 0] } },
  erze: { mana: { regen: 75, attack: 250 }, wait: 0, attack: [{ lands: [0.4], blows: [500], until: 0.6 }, { lands: [0.3, 0.7], blows: [500, 500], until: 0.9 }, { lands: [0.7], blows: [1500], until: 1.5 }], books: { dmg: [0.5, 0.5, 0.5, 0.5], heal: [0, 0, 0, 0] } },
  ezekiel: { mana: { regen: 75, attack: 185 }, wait: 0, attack: [{ lands: [0.3], blows: [670], until: 0.5 }, { lands: [0.2, 0.5], blows: [670, 670], until: 0.8 }, { lands: [0.4], blows: [670], until: 0.7 }, { lands: [0.3], blows: [670], until: 1 }], books: { dmg: [0.5, 0.5, 0.5, 0.5], heal: [0, 0, 0, 0] } },
  'fallen-frey': { mana: { regen: 85, attack: 500 }, wait: 0, attack: [{ lands: [1.1], blows: [2500], until: 2 }], books: { dmg: [0.5, 0, 0.5, 0], heal: [0.5, 0.5, 0, 0] } },
  gau: { mana: { regen: 75, attack: 340 }, wait: 0, attack: [{ lands: [0.9], blows: [1350], until: 1.3 }, { lands: [0.3, 0.7], blows: [1350, 1350], until: 1.2 }, { lands: [0.3], blows: [1350], until: 1.6 }], books: { dmg: [0.5, 0.5, 0.25, 0.25], heal: [0, 0, 0, 0] } },
  gremory: { mana: { regen: 75, attack: 600 }, wait: 0, attack: [{ lands: [1, 1.1, 1.2], blows: [1000, 1000, 1000], until: 2.4 }], books: { dmg: [0.5, 0.5, 0.5, 0], heal: [0, 0, 0, 0] } },
  kirze: { mana: { regen: 150, attack: 325 }, wait: 0, attack: [{ lands: [0.3, 0.5], blows: [1000, 1000], until: 0.8 }, { lands: [0.4, 1], blows: [1000, 1000], until: 1.3 }, { lands: [0.7], blows: [1000], until: 1.8 }], books: { dmg: [0.5, 0.5, 0.5, 0], heal: [0, 0, 0, 0] } },
  klaus: { mana: { regen: 75, attack: 330 }, wait: 0, attack: [{ lands: [0.5, 0.7], blows: [880, 880], until: 1 }, { lands: [0.6, 1.1], blows: [880, 880], until: 1.4 }, { lands: [0.7], blows: [880], until: 1.6 }], books: { dmg: [0.5, 0.5, 0.5, 0.5], heal: [0, 0, 0, 0] } },
  laias: { mana: { regen: 85, attack: 425 }, wait: 0.3, attack: [{ lands: [1], blows: [1920], until: 1.7 }], books: { dmg: [0, 0, 0.5, 0.5], heal: [0.5, 0.25, 0, 0] } },
  loman: { mana: { regen: 75, attack: 250 }, wait: 0, attack: [{ lands: [0.3], blows: [800], until: 0.5 }, { lands: [0.4], blows: [800], until: 0.9 }, { lands: [0.2, 0.7], blows: [800, 800], until: 1 }, { lands: [0.6], blows: [1200], until: 1.6 }], books: { dmg: [0.25, 0, 0.5, 0.5], heal: [0, 0.5, 0, 0] } },
  lorraine: { mana: { regen: 100, attack: 325 }, wait: 0, attack: [{ lands: [0.3], blows: [1540], until: 1.3 }], books: { dmg: [0.5, 0.5, 0.5, 0.5], heal: [0, 0, 0, 0] } },
  lucikiel: { mana: { regen: 100, attack: 292 }, wait: 0, attack: [{ lands: [0.3], blows: [750], until: 0.6 }, { lands: [0.4, 1.2], blows: [750, 750], until: 1.4 }, { lands: [0.5], blows: [750], until: 1.5 }], books: { dmg: [0.5, 0.5, 0.5, 0], heal: [0, 0, 0, 0.5] } },
  morrah: { mana: { regen: 75, attack: 240 }, wait: 0, attack: [{ lands: [0.3], blows: [912], until: 0.6 }, { lands: [0.2, 0.4], blows: [912, 912], until: 0.8 }, { lands: [0.5], blows: [912], until: 0.8 }, { lands: [0.8], blows: [912], until: 1.6 }], books: { dmg: [0.5, 0.5, 0.5, 0.5], heal: [0, 0, 0, 0] } },
  naila: { mana: { regen: 75, attack: 235 }, wait: 0, attack: [{ lands: [0.3], blows: [760], until: 0.6 }, { lands: [0.1, 0.3, 0.7], blows: [760, 760, 760], until: 0.9 }, { lands: [0.3], blows: [760], until: 0.7 }, { lands: [0.6], blows: [760], until: 1.6 }], books: { dmg: [0.5, 0.5, 0.5, 0.5], heal: [0, 0, 0, 0] } },
  neraxis: { mana: { regen: 75, attack: 255 }, wait: 0, attack: [{ lands: [0.4, 0.6], blows: [800, 800], until: 0.8 }, { lands: [0.2], blows: [800], until: 0.4 }, { lands: [0.4, 1.1], blows: [800, 800], until: 1.9 }], books: { dmg: [0.5, 0.5, 0.5, 0.5], heal: [0, 0, 0, 0] } },
  oddy: { mana: { regen: 75, attack: 550 }, wait: 0, attack: [{ lands: [1.4], blows: [3100], until: 2.2 }], books: { dmg: [0.25, 0.25, 0.25, 0.25], heal: [0, 0, 0, 0] } },
  phillop: { mana: { regen: 75, attack: 275 }, wait: 0, attack: [{ lands: [0.4], blows: [1056], until: 0.7 }, { lands: [0.3, 0.6], blows: [1056, 1056], until: 1 }, { lands: [0.2], blows: [1056], until: 0.6 }, { lands: [0.6], blows: [1056], until: 2.1 }], books: { dmg: [0.5, 0.5, 0.5, 0.25], heal: [0, 0, 0, 0] } },
  'rebel-klaus': { mana: { regen: 75, attack: 210 }, wait: 0, attack: [{ lands: [0.4, 0.6], blows: [360, 360], until: 0.8 }, { lands: [0.3, 0.6], blows: [360, 360], until: 0.9 }, { lands: [0.2, 0.4], blows: [360, 360], until: 0.8 }], books: { dmg: [0.5, 0.5, 0.5, 0.75], heal: [0, 0, 0, 0] } },
  selene: { mana: { regen: 75, attack: 500 }, wait: 0, attack: [{ lands: [1], blows: [2860], until: 2 }], books: { dmg: [0.5, 0.5, 0.5, 0.25], heal: [0, 0, 0, 0] } },
  seria: { mana: { regen: 75, attack: 275 }, wait: 0, attack: [{ lands: [0.4], blows: [1000], until: 0.6 }, { lands: [0.5], blows: [1000], until: 0.7 }, { lands: [0.4, 0.8], blows: [950, 950], until: 2 }], books: { dmg: [0.5, 0.5, 0.5, 0.5], heal: [0, 0, 0, 0] } },
  tanya: { mana: { regen: 75, attack: 285 }, wait: 0, attack: [{ lands: [0.5, 0.7, 0.9, 1.4], blows: [682, 682, 682, 682], until: 1.6 }, { lands: [0.2, 0.3], blows: [682, 682], until: 1.1 }, { lands: [0.2], blows: [682], until: 0.7 }], books: { dmg: [0.5, 0.5, 0.5, 0.5], heal: [0, 0, 0, 0] } },
  valance: { mana: { regen: 75, attack: 425 }, wait: 0, attack: [{ lands: [1.2], blows: [1400], until: 2.3 }], books: { dmg: [0.5, 0, 0.5, 0], heal: [0, 0, 0, 0] } },
  yanne: { mana: { regen: 75, attack: 375 }, wait: 0, attack: [{ lands: [1.2], blows: [2000], until: 1.5 }, { lands: [1], blows: [2000], until: 1.5 }], books: { dmg: [0.5, 0.5, 0.5, 0.5], heal: [0, 0, 0, 0] } },
};

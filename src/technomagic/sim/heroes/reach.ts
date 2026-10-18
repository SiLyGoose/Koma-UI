// Made by KR-extracted/scripts/tm-reach.mjs from King's Raid's CBT2 playtest's skills: don't edit it.

/*
 * How far about its target each hero's blows land, as King's Raid's playtest has its damage (metres): its attack's and its
 * three skills'. 0: its target alone; Infinity: every enemy on the field. (A raid of more than one enemy: ../fight.ts.)
 */
export interface Reach {
  attack: number;
  skills: readonly [number, number, number];
}

export const REACH: Readonly<Record<string, Reach>> = {
  annette: { attack: 0, skills: [1, 0, 3] },
  crow: { attack: 0, skills: [3, 2, 0] },
  'dark-lord-kasel': { attack: 1, skills: [2, 2, Infinity] },
  erze: { attack: 0, skills: [Infinity, 0, 0] },
  ezekiel: { attack: 0, skills: [3, 0, 0] },
  'fallen-frey': { attack: 0, skills: [Infinity, 0, 2.5] },
  gau: { attack: 1.5, skills: [2, 0, 4.5] },
  gremory: { attack: 0, skills: [0, 0, 0] },
  kirze: { attack: 1.5, skills: [3, Infinity, 1.5] },
  klaus: { attack: 1, skills: [0, 1, 0] },
  laias: { attack: 0, skills: [0, 0, Infinity] },
  loman: { attack: 1, skills: [2, 0, 1] },
  lorraine: { attack: 0, skills: [2.5, 0, 4.5] },
  lucikiel: { attack: 2, skills: [3.5, 2, 5] },
  morrah: { attack: 1, skills: [0, 0, 0] },
  naila: { attack: 0, skills: [0, 0, 5] },
  neraxis: { attack: 0, skills: [2, Infinity, 4] },
  oddy: { attack: 0, skills: [1.5, 0, Infinity] },
  phillop: { attack: 0.5, skills: [2, 1, 0] },
  'rebel-klaus': { attack: 1.8, skills: [3, Infinity, 5] },
  selene: { attack: 0, skills: [0, 0, 2] },
  seria: { attack: 1, skills: [2, 4, 0] },
  tanya: { attack: 0, skills: [0, 5, 0] },
  valance: { attack: 0, skills: [0, 0, 0] },
  yanne: { attack: 0, skills: [0, 5, 0] },
};

/*
 * The fight's chances: a seeded random number generator (sfc32), so the same seed gives the same fight
 * wherever it runs. Whole-number sums only (Math.imul, shifts), which every computer works out alike.
 */

export interface Random {
  /** A number from 0 up to (not including) 1. */
  next(): number;
  /** Where it is in its run: the same seed and the same calls leave it the same. */
  state(): readonly [number, number, number, number];
}

/** A generator for `seed` (a whole number; only its low 32 bits count). */
export function seeded(seed: number): Random {
  let a = 0x9e3779b9;
  let b = 0x243f6a88;
  let c = 0xb7e15162;
  let d = seed >>> 0;
  const step = (): number => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  };
  // Stirred well first, so seeds close together start far apart.
  for (let i = 0; i < 15; i++) step();
  return {
    next: () => step() / 4294967296,
    state: () => [a >>> 0, b >>> 0, c >>> 0, d >>> 0],
  };
}

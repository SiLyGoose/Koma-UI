/*
 * A movement written down as a track: poses at times (seconds). A hero with no animation of King's Raid's
 * moves by tracks like these (../heroes/moves/), read each frame.
 */

/** A pose at a time; what it leaves out is as at rest. */
export type Key<P> = [at: number, pose: Partial<P>, ease?: (k: number) => number];

/** How long a track runs. */
export const lengthOf = <P>(keys: readonly Key<P>[]): number => (keys.at(-1) as Key<P>)[0];

/**
 * The pose `t` seconds into a track, flowing through its poses rather than stopping at each: every
 * part of the pose keeps the speed it has as it passes one that lies on its way, and slows only where
 * it turns back (or the track has it wait). The poses' easings aren't used: how fast a movement is
 * comes from how close together its poses are. Before the track it is its first pose, after it `still`.
 */
export function flowAt<P extends Record<string, number>>(keys: readonly Key<P>[], t: number, still: P): P {
  const last = keys.length - 1;
  if (t >= (keys[last] as Key<P>)[0]) return still;
  let i = 0;
  while (i < last - 1 && t > (keys[i + 1] as Key<P>)[0]) i++;
  const time = (n: number): number => (keys[n] as Key<P>)[0];
  const pose: Record<string, number> = {};
  for (const part of Object.keys(still)) {
    const value = (n: number): number => (keys[Math.min(last, Math.max(0, n))] as Key<P>)[1][part] ?? (still[part] as number);
    /** How fast the part is changing between pose n and the next. */
    const slope = (n: number): number => (n < 0 || n >= last ? 0 : (value(n + 1) - value(n)) / (time(n + 1) - time(n)));
    /** How fast it is changing as it passes pose n: nothing where it turns back there, else between the speeds either side. */
    const speed = (n: number): number => {
      const before = slope(n - 1);
      const after = slope(n);
      if (n <= 0 || n >= last || before * after <= 0) return 0;
      const a = time(n) - time(n - 1);
      const b = time(n + 1) - time(n);
      return (3 * (a + b)) / ((2 * b + a) / before + (b + 2 * a) / after);
    };
    const h = time(i + 1) - time(i);
    const k = Math.min(1, Math.max(0, (t - time(i)) / h));
    const k2 = k * k;
    const k3 = k2 * k;
    pose[part] = (2 * k3 - 3 * k2 + 1) * value(i) + (k3 - 2 * k2 + k) * h * speed(i) + (-2 * k3 + 3 * k2) * value(i + 1) + (k3 - k2) * h * speed(i + 1);
  }
  return pose as P;
}

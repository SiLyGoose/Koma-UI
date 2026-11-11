import type { BossFx, FxScene } from '../../fight/fx';

/*
 * What is drawn for what Ascalon's skills do (../../sim/bosses/ascalon/skills.ts), beyond his body's own moves (./model.ts) and
 * what his attacks play on him and on whom their blows land (his assets' vfx): King's Raid's own, as his skill script has them
 * (Raid/Tech/Ascalon.bjs; their codes his assets' vfx `own`, read with the rest).
 * - His attack's last blow, on the hero it is aimed at (ReserveOperation_3592000_2: Attack1.Hit2).
 * - Multi-Dimension Barrage: its circle under the hero it goes for while he charges, and a bolt flown at it as each lands
 *   (Skill1.Circle, Skill1.Projectile; each bolt's hit is his assets').
 * - Dimension Barrage and, in the waves before him, Eye of Ascalon: a dimension gate on each hero (Skill1.Circle), its bolt
 *   flown down and its hit half a second on, as the blow lands (ReserveOperation_3592040_1, and 3400098/99's).
 * - Dimension Warp: his warp on him while it lasts (Skill2.Buff), gone as he is neutralized, or as it runs out with beasts
 *   standing. (The Portal each of its beasts comes through is the beasts', ../../assets/minions.ts.)
 * What comes later in each (a bolt's flight, a gate's hit) is timed by the fight's own time, as the boss's body is moved
 * (ascalonFx.update, from it): a page away comes back to it as the fight has it.
 */

const AS = 'Skill.Boss.Ascalon';
const CIRCLE = `${AS}.Skill1.Circle`;
const BOLT = `${AS}.Skill1.Projectile`;
const HIT = `${AS}.Skill1.Hit`;
const SMITE = `${AS}.Attack1.Hit2`;
const WARP = `${AS}.Skill2.Buff`;
/** A gate's: how long its circle stays, when its bolt is flown down, and when it lands (the sim's GATE.delay and EYE.delay). */
const GATE = { circle: 1.5, bolt: 0.3, lands: 0.5 };
/** Multi-Dimension Barrage: its circle's time (to its last bolt), and its bolts flown, each a moment before it lands (3.1 to 3.4 s). */
const BARRAGE = { circle: 3.4, bolts: [3, 3.1, 3.2, 3.3] };
/** How long his warp lasts at most (the sim's WARP.lasts). */
const WARP_LASTS = 20;

/** What is to be played so far on (seconds of the fight's), and what stops his warp's while it is on him. */
let pending: { left: number; play: () => void }[] = [];
let warping: (() => void) | null = null;
const later = (left: number, play: () => void): void => {
  pending.push({ left, play });
};

/** A dimension gate on each hero, its bolt flown down and landing. */
function gates({ kr }: FxScene, heroes: readonly number[]): void {
  for (const who of heroes) {
    kr(CIRCLE, { who, lasts: GATE.circle });
    later(GATE.bolt, () => kr(BOLT, { who }));
    later(GATE.lands, () => kr(HIT, { who }));
  }
}

/** His warp gone from him. */
function unwarp(): void {
  warping?.();
  warping = null;
}

export const ASCALON_FX: BossFx = {
  barrage({ kr }, [who]) {
    if (who === undefined) return;
    kr(CIRCLE, { who, lasts: BARRAGE.circle });
    for (const at of BARRAGE.bolts) later(at, () => kr(BOLT, { who }));
  },
  smite({ kr }, [who]) {
    if (who !== undefined) kr(SMITE, { who });
  },
  gate: gates,
  eye: gates,
  warp({ kr, bossFeet }) {
    unwarp();
    warping = kr(WARP, { at: bossFeet, lasts: WARP_LASTS });
  },
  neutralized: unwarp,
  empowered: unwarp,
};

/** What his fx have still to play, moved on by `dt` seconds of the fight's (from his body: ./model.ts); and all of it dropped (`clear`), the fight done with. */
export const ascalonFx = {
  update(dt: number): void {
    if (pending.length === 0) return;
    for (const one of pending) one.left -= dt;
    const due = pending.filter((one) => one.left <= 0);
    pending = pending.filter((one) => one.left > 0);
    for (const one of due) one.play();
  },
  clear(): void {
    pending = [];
    unwarp();
  },
};

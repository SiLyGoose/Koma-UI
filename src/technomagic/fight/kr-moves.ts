import type { Object3D, Vector3 } from 'three';
import type { BossAssets, HeroAssets } from '../assets';
import type { KrEffects } from '../fx/kr-effects';
import { SCALE, type Hero } from '../heroes/body/hero';
import { HERO_TURN } from '../sim';

/*
 * King's Raid's own effects for the heroes' moves (each hero's asset file's `vfx`, played by ../fx/kr-effects.ts): as a
 * move begins, on the hero (of those numbered, its attack's Casting1, 2…, one each time, in turn: one for each of the
 * game's clips it plays), and as each of its blows lands, where it lands (the boss), turned as the hero is; a shot's at the
 * hero. A projectile's isn't played: the game flies it there itself.
 */

/** The same effect again within this many seconds isn't played (a move's many blows landing close together). */
const APART = 0.12;

export interface KrMoves {
  /** A hero (`who`: by its index among the fighters) begins a move: whether the game has effects for it (its own are drawn in their place). */
  start(who: number, move: string): boolean;
  /** A blow of a hero's move lands: the same. */
  land(who: number, move: string): boolean;
}

const flies = (code: string): boolean => /Projectile|Projecitle/.test(code);
const shot = (code: string): boolean => /Shot|Shoot/.test(code);
/** Where an effect's code ends in a number (Casting1, Attack1.2): which one of a numbered lot it is. */
const numberOf = (code: string): number | null => {
  const m = code.match(/(\d+)$/);
  return m ? Number(m[1]) : null;
};

/** The effects of `heroes`' moves (by their index among the fighters; `bodies` theirs on the field), their blows landing at `target`. */
export function makeKrMoves(kr: KrEffects, heroes: readonly HeroAssets[], bodies: readonly Hero[], target: Vector3): KrMoves {
  // Read as the fight begins (the fight's heroes' alone).
  kr.read(heroes.flatMap((hero) => Object.values(hero.vfx ?? {}).flatMap((move) => [...(move.start ?? []), ...(move.land ?? [])].filter((code) => !flies(code)))));
  const begun = new Map<string, number>();
  const last = new Map<string, number>();
  let now = 0;
  return {
    start(who, move) {
      const codes = heroes[who]?.vfx?.[move]?.start;
      const body = bodies[who];
      if (!codes || !body) return false;
      const key = `${who}:${move}`;
      const n = begun.get(key) ?? 0;
      begun.set(key, n + 1);
      const numbered = codes.filter((code) => numberOf(code) !== null).sort((a, b) => (numberOf(a) as number) - (numberOf(b) as number));
      const one = numbered.length > 0 ? [numbered[n % numbered.length] as string] : [];
      for (const code of [...codes.filter((code) => numberOf(code) === null), ...one]) kr.play(code, { on: body.root, scale: SCALE });
      return true;
    },
    land(who, move) {
      now = performance.now() / 1000;
      const codes = heroes[who]?.vfx?.[move]?.land?.filter((code) => !flies(code));
      const body = bodies[who];
      if (!codes?.length || !body) return false;
      for (const code of codes) {
        const key = `${who}:${code}`;
        if (now - (last.get(key) ?? -Infinity) < APART) continue;
        last.set(key, now);
        if (shot(code)) kr.play(code, { on: body.root, scale: SCALE });
        else kr.play(code, { at: target, turn: HERO_TURN, scale: SCALE });
      }
      return true;
    },
  };
}

export interface KrBoss {
  /** The boss begins an attack (by its name). */
  use(attack: string): void;
  /** A blow of its (of the attack it began last) lands on a hero (`who`). */
  hurt(who: number): void;
  /** Plays its coming on the field, once that has been read (unless it attacks first). */
  update(): void;
}

/** The effects of the boss's attacks (its asset file's `vfx`): on `root` as each begins, and on the heroes (`bodies`) its blows land on; and its coming on the field. */
export function makeKrBoss(kr: KrEffects, boss: BossAssets, root: Object3D, bodies: readonly Hero[]): KrBoss {
  const { attacks = {}, advent = [] } = boss.vfx ?? {};
  kr.read([...advent, ...Object.values(attacks).flatMap((attack) => [...(attack.start ?? []), ...(attack.hit ?? [])])]);
  let coming = advent.length > 0;
  let attack = '';
  const last = new Map<string, number>();
  return {
    use(name) {
      attack = name;
      coming = false;
      for (const code of attacks[name]?.start ?? []) kr.play(code, { on: root });
    },
    hurt(who) {
      const body = bodies[who];
      if (!body) return;
      const now = performance.now() / 1000;
      for (const code of attacks[attack]?.hit ?? []) {
        const key = `${who}:${code}`;
        if (now - (last.get(key) ?? -Infinity) < APART) continue;
        last.set(key, now);
        kr.play(code, { on: body.root, scale: SCALE });
      }
    },
    update() {
      if (!coming || !advent.every((code) => kr.ready(code))) return;
      coming = false;
      for (const code of advent) kr.play(code, { on: root });
    },
  };
}

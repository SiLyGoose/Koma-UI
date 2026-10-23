import { Object3D, Vector3 } from 'three';
import type { BossAssets, HeroAssets } from '../assets';
import type { KrEffects } from '../fx/kr-effects';
import { SCALE, type Hero } from '../heroes/body/hero';
import { HERO_TURN } from '../sim';

/*
 * King's Raid's own effects for the heroes' moves (each hero's asset file's `vfx`, played by ../fx/kr-effects.ts): as a
 * move begins, on the hero (of those numbered, its attack's Casting1, 2…, one each time, in turn: one for each of the
 * game's clips it plays), and as each of its blows lands, where it lands (the boss), turned as the hero is; a shot's at the
 * hero. A blow with a projectile has it flown from the hero (what it holds, or its head) to where it lands, and the
 * rest played there as it gets there.
 */

/** The same effect again within this many seconds isn't played (a move's many blows landing close together). */
const APART = 0.12;
/** How fast a projectile flies (the field's units a second), and the least and most it takes to get there (seconds). */
const SPEED = 40;
const FLIGHT = { least: 0.1, most: 0.3 };
/** How long what a projectile flew on stays where it got to, for what it leaves behind to live out (seconds). */
const LINGER = 2;

export interface KrMoves {
  /** A hero (`who`: by its index among the fighters) begins a move: whether the game has effects for it (its own are drawn in their place). */
  start(who: number, move: string): boolean;
  /** A blow of a hero's move lands: the same. */
  land(who: number, move: string): boolean;
  /** Moves the projectiles on (seconds). */
  update(dt: number): void;
  /** Takes every projectile off (the fight is done with). */
  clear(): void;
}

const flies = (code: string): boolean => /Projectile|Projecitle/.test(code);
const shot = (code: string): boolean => /Shot|Shoot/.test(code);
/** Where an effect's code ends in a number (Casting1, Attack1.2): which one of a numbered lot it is. */
const numberOf = (code: string): number | null => {
  const m = code.match(/(\d+)$/);
  return m ? Number(m[1]) : null;
};

/** Every effect a hero's moves play, what its skills keep on a hero they guard, and what its fx play themselves. */
export const heroEffects = (hero: HeroAssets): string[] => [
  ...Object.values(hero.vfx ?? {}).flatMap((move) => [...(move.start ?? []), ...(move.land ?? [])]),
  ...Object.values(hero.wards ?? {}),
  ...(hero.krFx ?? []),
];

/** Every effect a boss plays: its attacks', its coming on the field, and what its skills keep on a hero. */
export const bossEffects = (boss: BossAssets): string[] => {
  const { attacks = {}, advent = [] } = boss.vfx ?? {};
  return [...advent, ...Object.values(attacks).flatMap((attack) => [...(attack.start ?? []), ...(attack.hit ?? [])]), ...Object.values(boss.wards ?? {})];
};

/** A projectile on its way: what it flies on, from where to where, how long it has flown and takes, and what is played as it gets there. */
interface Flight {
  carrier: Object3D;
  from: Vector3;
  to: Vector3;
  t: number;
  time: number;
  then: readonly string[];
}

/** The effects of `heroes`' moves (by their index among the fighters; `bodies` theirs on the field), their blows landing at `target`; projectiles flown in `scene`. */
export function makeKrMoves(kr: KrEffects, heroes: readonly HeroAssets[], bodies: readonly Hero[], target: Vector3, scene: Object3D): KrMoves {
  // Read as the fight begins (the fight's heroes' alone), unless they were already (in a room, as each was picked).
  kr.read(heroes.flatMap(heroEffects));
  const begun = new Map<string, number>();
  const last = new Map<string, number>();
  /** How many projectiles each hero's move has flown (of several, each in turn). */
  const flown = new Map<string, number>();
  const flights: Flight[] = [];
  let now = 0;
  /** Plays a blow's effects where it lands (but a shot's, at the hero), each not again within APART of the last. */
  const hit = (who: number, body: Hero, codes: readonly string[], at: Vector3): void => {
    for (const code of codes) {
      const key = `${who}:${code}`;
      if (now - (last.get(key) ?? -Infinity) < APART) continue;
      last.set(key, now);
      if (shot(code)) kr.play(code, { on: body.root, scale: SCALE });
      else kr.play(code, { at, turn: HERO_TURN, scale: SCALE });
    }
  };
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
      const codes = heroes[who]?.vfx?.[move]?.land;
      const body = bodies[who];
      if (!codes?.length || !body) return false;
      const projectiles = codes.filter(flies);
      if (projectiles.length === 0) {
        hit(who, body, codes, target);
        return true;
      }
      // One projectile a blow (of several, each in turn), flown from what it holds (or its head) as fast as SPEED; its
      // shots played now, and the rest as it gets there.
      const key = `${who}:${move}`;
      const n = flown.get(key) ?? 0;
      flown.set(key, n + 1);
      const from = body.muzzle?.(new Vector3()) ?? body.head(new Vector3());
      const to = target.clone();
      const time = Math.min(FLIGHT.most, Math.max(FLIGHT.least, from.distanceTo(to) / SPEED));
      const carrier = new Object3D();
      carrier.position.copy(from);
      carrier.rotation.y = HERO_TURN;
      scene.add(carrier);
      kr.play(projectiles[n % projectiles.length] as string, { on: carrier, scale: SCALE, lasts: time });
      const rest = codes.filter((code) => !flies(code));
      hit(who, body, rest.filter(shot), to);
      flights.push({ carrier, from, to, t: 0, time, then: rest.filter((code) => !shot(code)) });
      return true;
    },
    update(dt) {
      for (let i = flights.length - 1; i >= 0; i--) {
        const flight = flights[i] as Flight;
        const was = flight.t;
        flight.t += dt;
        flight.carrier.position.lerpVectors(flight.from, flight.to, Math.min(1, flight.t / flight.time));
        if (was < flight.time && flight.t >= flight.time)
          for (const code of flight.then) kr.play(code, { at: flight.to, turn: HERO_TURN, scale: SCALE });
        if (flight.t >= flight.time + LINGER) {
          flight.carrier.removeFromParent();
          flights.splice(i, 1);
        }
      }
    },
    clear() {
      for (const flight of flights) flight.carrier.removeFromParent();
      flights.length = 0;
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
  kr.read(bossEffects(boss));
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

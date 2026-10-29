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
 * rest played there as it gets there. And the boss's: as each of its attacks begins, its projectiles (flown from where
 * its body says), and as its blows land on a hero.
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

/** A hero's files as its skin `skin` (by its name) has them: that look's own effects for its moves, where it has its own. */
export const inSkin = (hero: HeroAssets, skin: string | undefined): HeroAssets => {
  const vfx = hero.skins.find((one) => one.name === skin)?.vfx;
  return vfx ? { ...hero, vfx } : hero;
};

/** The effects a hero's skin `skin` (by its name) wears all the while (SkinAssets.wears). */
export const wornBy = (hero: HeroAssets, skin: string | undefined): readonly string[] => hero.skins.find((one) => one.name === skin)?.wears ?? [];

/** Every effect a hero's moves play, what its skills keep on a hero they guard, and what its fx play themselves. */
export const heroEffects = (hero: HeroAssets): string[] => [
  ...Object.values(hero.vfx ?? {}).flatMap((move) => [...(move.start ?? []), ...(move.land ?? [])]),
  ...Object.values(hero.wards ?? {}),
  ...Object.values(hero.wardEnds ?? {}),
  ...(hero.krFx ?? []),
];

/** Every effect a boss plays: its attacks' (and their projectiles), its coming on the field, and what its skills keep on a hero. */
export const bossEffects = (boss: BossAssets): string[] => {
  const { attacks = {}, advent = [] } = boss.vfx ?? {};
  return [
    ...advent,
    ...Object.values(attacks).flatMap((attack) => [...(attack.start ?? []), ...(attack.hit ?? []), ...(attack.fly ?? [])]),
    ...Object.values(boss.holds ?? {}).flatMap((hold) => (hold.effect ? [hold.effect] : [])),
  ];
};

/** A projectile on its way: what it flies on, from where to where, how long it has flown and takes, and what is played (and how big) as it gets there. */
interface Flight {
  carrier: Object3D;
  from: Vector3;
  to: Vector3;
  t: number;
  time: number;
  then: readonly string[];
  scale: number;
}

/** King's Raid's projectiles on their way, each on what it flies on. */
interface Flights {
  /** Flies `code` from one place to another in `time` seconds, turned `turn` radians about the upright and `scale` times as big; then plays `then` where it got to. */
  fly(code: string, from: Vector3, to: Vector3, time: number, turn: number, scale: number, then?: readonly string[]): void;
  update(dt: number): void;
  clear(): void;
}

/** Projectiles flown in `scene`. */
function makeFlights(kr: KrEffects, scene: Object3D): Flights {
  const flights: Flight[] = [];
  return {
    fly(code, from, to, time, turn, scale, then = []) {
      const carrier = new Object3D();
      carrier.position.copy(from);
      carrier.rotation.y = turn;
      scene.add(carrier);
      kr.play(code, { on: carrier, scale, lasts: time });
      flights.push({ carrier, from: from.clone(), to: to.clone(), t: 0, time, then, scale });
    },
    update(dt) {
      for (let i = flights.length - 1; i >= 0; i--) {
        const flight = flights[i] as Flight;
        const was = flight.t;
        flight.t += dt;
        flight.carrier.position.lerpVectors(flight.from, flight.to, Math.min(1, flight.t / flight.time));
        if (was < flight.time && flight.t >= flight.time) for (const code of flight.then) kr.play(code, { at: flight.to, turn: HERO_TURN, scale: flight.scale });
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

/**
 * The effects of `heroes`' moves (by their index among the fighters; `bodies` theirs on the field), their blows landing at
 * `target`; projectiles flown in `scene`. And what each wears all the while (`worn`, by the same index: its skin's), on it
 * from when it has been read till the fight is done with.
 */
export function makeKrMoves(kr: KrEffects, heroes: readonly HeroAssets[], bodies: readonly Hero[], target: Vector3, scene: Object3D, worn: readonly (readonly string[])[] = []): KrMoves {
  // Read as the fight begins (the fight's heroes' alone), unless they were already (in a room, as each was picked).
  kr.read([...heroes.flatMap(heroEffects), ...worn.flat()]);
  /** What each hero wears not on it yet (by its index): put on as it's read. */
  const toWear = worn.map((codes) => new Set(codes));
  const wearing: (() => void)[] = [];
  const begun = new Map<string, number>();
  const last = new Map<string, number>();
  /** How many projectiles each hero's move has flown (of several, each in turn). */
  const flown = new Map<string, number>();
  const flights = makeFlights(kr, scene);
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
      const time = Math.min(FLIGHT.most, Math.max(FLIGHT.least, from.distanceTo(target) / SPEED));
      const rest = codes.filter((code) => !flies(code));
      hit(who, body, rest.filter(shot), target);
      flights.fly(projectiles[n % projectiles.length] as string, from, target, time, HERO_TURN, SCALE, rest.filter((code) => !shot(code)));
      return true;
    },
    update(dt) {
      flights.update(dt);
      toWear.forEach((codes, who) => {
        const body = bodies[who];
        if (!body) return;
        for (const code of codes)
          if (kr.ready(code)) {
            wearing.push(kr.play(code, { on: body.root, scale: SCALE, lasts: Infinity }));
            codes.delete(code);
          }
      });
    },
    clear() {
      flights.clear();
      for (const stop of wearing.splice(0)) stop();
      for (const codes of toWear) codes.clear();
    },
  };
}

export interface KrBoss {
  /** The boss begins an attack (by its name). */
  use(attack: string): void;
  /** A blow of its (of the attack it began last) lands on a hero (`who`). */
  hurt(who: number): void;
  /** Its attack's projectile (of the attack it began last: its vfx's fly) flown from `from` (a mouth) to `to` in `time` seconds: as its body launches it (Boss.launch). */
  fly(from: Vector3, to: Vector3, time: number): void;
  /** Plays its coming on the field, once that has been read (unless it attacks first); and moves its projectiles on (seconds). */
  update(dt: number): void;
  /** Takes its projectiles off (the fight is done with). */
  clear(): void;
}

/**
 * The effects of the boss's attacks (its asset file's `vfx`): on `root` as each begins, its projectiles flown in `scene`
 * (as big as the game has them: its units are the game's), and on the heroes (`bodies`) its blows land on; and its
 * coming on the field.
 */
export function makeKrBoss(kr: KrEffects, boss: BossAssets, root: Object3D, bodies: readonly Hero[], scene: Object3D): KrBoss {
  const { attacks = {}, advent = [] } = boss.vfx ?? {};
  kr.read(bossEffects(boss));
  let coming = advent.length > 0;
  let attack = '';
  const last = new Map<string, number>();
  const flights = makeFlights(kr, scene);
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
    fly(from, to, time) {
      // (Turned as the boss faces: toward the heroes.)
      for (const code of attacks[attack]?.fly ?? []) flights.fly(code, from, to, time, HERO_TURN + Math.PI, 1);
    },
    update(dt) {
      flights.update(dt);
      if (!coming || !advent.every((code) => kr.ready(code))) return;
      coming = false;
      for (const code of advent) kr.play(code, { on: root });
    },
    clear: () => flights.clear(),
  };
}

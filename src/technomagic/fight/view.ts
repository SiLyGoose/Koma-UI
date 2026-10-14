import { Vector3, type Scene } from 'three';
import type { Boss } from '../bosses/boss';
import type { Effects } from '../fx/effects';
import type { Magic } from '../fx/magic';
import type { Hero } from '../heroes/body/hero';
import { HERO_FX } from '../heroes/fx';
import type { Popup } from '../hud/numbers';
import { HERO_TURN, HERO_X, type Sim } from '../sim';
import { COMMON_FX, type BossFx, type FxScene } from './fx';

/*
 * The fight as it is drawn: the boss's body and each hero's on the field, doing what the sim (../sim/) says
 * they do, and what is drawn for each blow and skill (./fx.ts, each hero's fx.ts and the boss's). Nothing
 * here changes how the fight goes: it is told what happened (the sim's events) and shows it.
 */

export interface FightView {
  /** What each blow took and each heal gave since the page last looked, for it to show coming off whom it was (the page empties it). */
  readonly numbers: Popup[];
  /** Where a hero stands on the field, and its head (for its health bar and its picture). */
  place(who: number, into: Vector3): Vector3;
  head(who: number, into: Vector3): Vector3;
  /** Whether a hero is drawn on the field. */
  shown(who: number): boolean;
  /** Draws what the sim says has happened since last time, and moves everything on by `dt` seconds. */
  update(now: number, dt: number): void;
  /** Takes the heroes off the field (the fight is done with). */
  clear(): void;
}

/** A fight drawn in `scene`: the sim's, its heroes' `bodies` (by their index among its fighters) and the boss's. */
export function makeFightView({ scene, sim, bodies, boss, bossFx, effects, magic }: { scene: Scene; sim: Sim; bodies: readonly Hero[]; boss: Boss; bossFx: BossFx; effects: Effects; magic: Magic }): FightView {
  const { def } = sim.foe;
  const at = new Vector3();
  const bossHit = new Vector3(...def.reach.hit).setX(def.stands.x + def.reach.hit[0]);
  const bossFeet = new Vector3(...def.reach.feet).setX(def.stands.x + def.reach.feet[0]);
  const numbers: Popup[] = [];
  const body = (who: number): Hero => bodies[who] as Hero;
  const on = new Set<number>();

  boss.root.position.x = def.stands.x;
  boss.root.rotation.y = def.stands.turn;
  if (!boss.root.parent) scene.add(boss.root);
  for (const hero of bodies) {
    hero.root.position.set(HERO_X, 0, 0);
    hero.root.rotation.y = HERO_TURN;
    // As it stands, for its picture should the page take one.
    hero.update(0, 0);
  }

  const fx: FxScene = {
    effects,
    magic,
    bossHit,
    bossFeet,
    place: (who, into) => body(who).place(into),
    head: (who, into) => body(who).head(into),
    leftHand: (who, into) => body(who).leftHand(into),
  };
  const fxOf = (who: number) => HERO_FX[(sim.fighters[who] as Sim['fighters'][number]).id];

  // The boss spits at the hero it is going for, at its chest (with no one, where one would stand).
  boss.target = (into) => {
    const target = sim.target();
    if (target && on.has(target.index)) body(target.index).head(into).y -= 0.8;
    else into.set(HERO_X, 1.6, 0);
    return into;
  };

  return {
    numbers,
    place: fx.place,
    head: fx.head,
    shown: (who) => on.has(who),
    update(now, dt) {
      for (const event of sim.events.splice(0)) {
        switch (event.kind) {
          case 'enter': {
            const hero = body(event.who);
            const fighter = sim.fighters[event.who] as Sim['fighters'][number];
            hero.root.position.set(fighter.x, 0, fighter.z);
            scene.add(hero.root);
            on.add(event.who);
            hero.enter();
            break;
          }
          case 'leave':
            scene.remove(body(event.who).root);
            on.delete(event.who);
            break;
          case 'start':
            body(event.who).start(event.move);
            // A skill: a ring rises round its feet as it begins.
            if (event.skill) {
              body(event.who).place(at).y = 0.05;
              effects.play('cast', at);
            }
            break;
          case 'stagger':
          case 'revive':
            body(event.who).stagger();
            break;
          case 'land':
            (fxOf(event.who)?.lands?.[event.move] ?? COMMON_FX.lands?.[event.move])?.(fx, event.who, event.part);
            break;
          case 'hurt':
            // Blocked: a ring round it, and no flinch.
            if (event.blocked) magic.ring(body(event.who).place(at), 0xffe9a8, 7, 0.4);
            else body(event.who).hit();
            break;
          case 'number': {
            const where = event.on === 'boss' ? bossHit.clone().setY(bossHit.y + (event.mend ? 1.4 : 0.6)) : body(event.on).head(new Vector3());
            numbers.push({ amount: event.amount, kind: event.type, at: where });
            break;
          }
          case 'cue':
            if (event.who === null) bossFx[event.name]?.(fx, event.targets);
            else fxOf(event.who)?.cues?.[event.name]?.(fx, event.who, event.targets);
            break;
          case 'boss-use':
            boss.use(event.attack);
            break;
          case 'boss-hit':
            boss.hit();
            break;
          case 'boss-daze':
            boss.daze(event.seconds, event.down);
            break;
          case 'boss-slow':
            boss.slow(event.rate, event.seconds);
            break;
          case 'end':
            break;
        }
      }

      boss.update(now, dt);
      // Each hero on the field where the sim has it, moving as fast as it does (its attack speed, and what quickens it).
      for (const who of on) {
        const fighter = sim.fighters[who] as Sim['fighters'][number];
        const hero = body(who);
        hero.root.position.x = fighter.x;
        hero.root.position.z = fighter.z;
        hero.update(now, sim.result ? 0 : dt * fighter.haste);
      }
      effects.update(dt);
      magic.update(dt);
    },
    clear() {
      for (const who of on) scene.remove(body(who).root);
      on.clear();
    },
  };
}

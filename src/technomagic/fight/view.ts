import { Vector3, type Scene } from 'three';
import type { Boss, BossLook } from '../bosses/boss';
import type { Effects } from '../fx/effects';
import type { Magic } from '../fx/magic';
import type { Props } from '../fx/props';
import { makeSigns } from '../fx/signs';
import { makeWards, type Emblem } from '../fx/wards';
import { FALL, type Hero } from '../heroes/body/hero';
import { HERO_FX } from '../heroes/fx';
import { lookOf } from '../heroes/looks';
import type { Popup } from '../hud/numbers';
import { HERO_TURN, HERO_X, type Sim } from '../sim';
import { COMMON_FX, type BossFx, type FxScene } from './fx';

/*
 * The fight as it is drawn: the boss's body and each hero's on the field, doing what the sim (../sim/) says
 * they do, and what is drawn for each blow and skill (./fx.ts, each hero's fx.ts and the boss's), what is kept on a
 * hero while it is guarded (../fx/wards.ts), and the signs of what comes on a fighter (../fx/signs.ts). Nothing
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
export function makeFightView({ scene, sim, bodies, boss, bossLook, bossFx, effects, magic, props }: { scene: Scene; sim: Sim; bodies: readonly Hero[]; boss: Boss; bossLook: BossLook; bossFx: BossFx; effects: Effects; magic: Magic; props: Props }): FightView {
  const { stands, reach } = bossLook;
  const at = new Vector3();
  const bossHit = new Vector3(...reach.hit).setX(stands.x + reach.hit[0]);
  const bossFeet = new Vector3(...reach.feet).setX(stands.x + reach.feet[0]);
  const numbers: Popup[] = [];
  const body = (who: number): Hero => bodies[who] as Hero;
  const on = new Set<number>();
  /**
   * The heroes that have fallen (or are getting up, revived): how far over each is (0 standing, 1 on its back),
   * and when it came to lie still (null: it hasn't yet), so it lies as it was then.
   */
  const fallen = new Map<number, { over: number; still: number | null }>();

  boss.root.position.x = stands.x;
  boss.root.rotation.y = stands.turn;
  if (!boss.root.parent) scene.add(boss.root);
  for (const hero of bodies) {
    hero.root.position.set(HERO_X, 0, 0);
    // Turned to face the boss first, then tipped over (onto its back) in its own way: about its own side.
    hero.root.rotation.set(0, HERO_TURN, 0, 'YXZ');
    // As it stands, for its picture should the page take one.
    hero.update(0, 0);
  }

  const fx: FxScene = {
    effects,
    magic,
    props,
    bossHit,
    bossFeet,
    place: (who, into) => body(who).place(into),
    head: (who, into) => body(who).head(into),
    leftHand: (who, into) => body(who).leftHand(into),
    floater: (who, into) => body(who).floater?.(into) ?? body(who).head(into),
    muzzle: (who, into) => body(who).muzzle?.(into) ?? body(who).head(into),
  };
  const fxOf = (who: number) => HERO_FX[(sim.fighters[who] as Sim['fighters'][number]).id];
  const wards = makeWards(scene, props);
  /** The skills of the heroes in the fight that guard a hero with a look of their own: by the status's name, its look. */
  const looks = new Map<string, Emblem>();
  for (const fighter of sim.fighters)
    for (const [status, name] of Object.entries(HERO_FX[fighter.id]?.wards ?? {})) looks.set(status, { hero: lookOf(fighter.id).assets, name });
  const emblems: Emblem[] = [];
  const signs = makeSigns(effects);
  const over = new Vector3();

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
          case 'leave': {
            const { root } = body(event.who);
            scene.remove(root);
            on.delete(event.who);
            // Put on again, it stands.
            fallen.delete(event.who);
            root.rotation.x = 0;
            root.position.y = 0;
            break;
          }
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
            if (event.type === 'heal' && event.on !== 'boss' && on.has(event.on)) signs.healed(event.on, body(event.on).place(over).setY(0.1));
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
            signs.dazed(bossHit);
            break;
          case 'boss-slow':
            boss.slow(event.rate, event.seconds);
            signs.slowed(bossHit);
            break;
          case 'end':
            break;
        }
      }

      boss.update(now, dt);
      // Each hero on the field where the sim has it, moving as fast as it does (its attack speed, and what quickens it).
      // One fallen goes over onto its back and lies still there; revived, it gets up again.
      for (const who of on) {
        const fighter = sim.fighters[who] as Sim['fighters'][number];
        const hero = body(who);
        hero.root.position.x = fighter.x;
        hero.root.position.z = fighter.z;
        // What guards it: a shield, and what else has a look of its own.
        emblems.length = 0;
        for (const status of [...fighter.statuses, ...sim.party]) {
          const look = looks.get(status.name);
          if (look) emblems.push(look);
        }
        wards.keep(who, hero.place(at), fighter.shield > 0, fighter.hp > 0 ? emblems : []);
        if (fighter.hp > 0) signs.hero(who, [...fighter.statuses, ...sim.party], () => hero.head(over));
        const down = fighter.hp <= 0;
        let lying = fallen.get(who);
        if (down && !lying) {
          hero.fall();
          lying = { over: 0, still: null };
          fallen.set(who, lying);
        }
        if (!lying) {
          hero.update(now, sim.result ? 0 : dt * fighter.haste);
          continue;
        }
        lying.over = Math.min(1, Math.max(0, lying.over + (down ? dt : -dt) / FALL.time));
        if (down && lying.over >= 1) lying.still ??= now;
        else lying.still = null;
        // Going over faster and faster, as a body falls.
        const k = lying.over * lying.over;
        hero.root.rotation.x = (-Math.PI / 2) * k;
        hero.root.position.y = FALL.lift * k;
        hero.update(lying.still ?? now, lying.still === null ? dt : 0);
        if (!down && lying.over <= 0) fallen.delete(who);
      }
      signs.boss(sim.foe.statuses, bossHit);
      wards.update(dt);
      signs.update(dt);
      effects.update(dt);
      magic.update(dt);
      props.update(dt);
    },
    clear() {
      for (const who of on) {
        const { root } = body(who);
        scene.remove(root);
        root.rotation.x = 0;
        root.position.y = 0;
      }
      on.clear();
      fallen.clear();
      wards.clear();
      signs.clear();
      props.clear();
    },
  };
}

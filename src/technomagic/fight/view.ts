import { Vector3, type Material, type Object3D, type Scene } from 'three';
import type { Boss, BossLook } from '../bosses/boss';
import { isMesh } from '../engine/models';
import type { Effects } from '../fx/effects';
import type { EffectName } from '../assets';
import type { KrEffects } from '../fx/kr-effects';
import type { Banners } from '../hud/banners';
import type { Minions } from './minions';
import type { Magic } from '../fx/magic';
import type { Props } from '../fx/props';
import { makeSigns } from '../fx/signs';
import { makeWards, type Emblem } from '../fx/wards';
import { FALL, SCALE, type Hero } from '../heroes/body/hero';
import { HERO_FX } from '../heroes/fx';
import { lookOf } from '../heroes/looks';
import type { Popup } from '../hud/numbers';
import { HERO_TURN, HERO_X, MARCH, MARCH_FROM, marchLeft, RUN_ON, TICK, type Sim, type SimEvent } from '../sim';
import type { BossDef } from '../sim/bosses/boss';
import { COMMON_FX, type BossFx, type FxScene } from './fx';
import { makeKrBoss, makeKrMoves } from './kr-moves';
import { makeFightSounds } from './sounds';

/** The game's own sign for each of the page's (../fx/signs.ts), and how big the boss's are drawn. */
const KR_SIGNS: Partial<Record<EffectName, string>> = {
  guard: 'Common.DefenseUp',
  ward: 'Common.DefenseMagicUp',
  haste: 'Common.SpeedUp',
  heal: 'Common.HealBig',
  weaken: 'Common.DefenseDown',
  slow: 'Common.SpeedDown',
  stun: 'Common.Stun',
};
const BOSS_SIGN = 3;
/** Every fight's effects for its signs (read with the boss's, in a room, before the fight). */
export const SIGN_EFFECTS: readonly string[] = Object.values(KR_SIGNS);

/*
 * The fight as it is drawn: the boss's body and each hero's on the field, doing what the sim (../sim/) says
 * they do, and what is drawn for each blow and skill (./fx.ts, each hero's fx.ts and the boss's), what is kept on a
 * hero while it is guarded (../fx/wards.ts), the signs of what comes on a fighter (../fx/signs.ts), and what is heard:
 * the heroes' blows and skills, the boss's attacks, and the raid's music (./sounds.ts). Nothing
 * here changes how the fight goes: it is told what happened (the sim's events) and shows it.
 */

/**
 * The hit-stop, as a blow of a skill lands (a hero's, on the boss; the boss's, on a hero): everything on the field
 * holds still for STOP seconds but the one whose skill it is, which goes on with it. The field goes DARK at once but
 * for it and what is drawn as light, lighting up again over LIGHTEN seconds after. Each body held still goes MAKE_UP
 * again as fast after, until it has caught up with the fight (which never stops).
 */
const STOP = 0.08;
const DARK = 0.55;
const LIGHTEN = 0.35;
const MAKE_UP = 0.25;

/**
 * A hero hidden (what of the sim's statuses hide one: Tanya's Stealth, and any other hero's) is drawn this
 * see-through, fading to it and back over FADE seconds.
 */
const HIDING = new Set(['Stealth']);
const HIDDEN = 0.4;
const FADE = 0.2;

/**
 * A raid's run up to the boss (../sim/rules.ts MARCH): the camera sets off this much of the way back with the heroes and
 * scrolls along with them, slowing as they do, to stand where it stands for the rest of the fight as they arrive (so
 * they gain on it a little, and the boss comes into the picture).
 */
const FOLLOW = 0.85;

/** What of the sim's events says what stands on the field (who is on it, the boss gone or back, the waves, the minions), not what is done there. */
const STANDING = new Set<SimEvent['kind']>(['enter', 'leave', 'boss-leave', 'boss-return', 'wave', 'foe-enter', 'foe-down', 'end']);

/**
 * The fight caught up all at once (a page joining it under way, or back after it was away): of what happened meanwhile,
 * only what says what stands on the field now, so it is drawn as it stands rather than every blow at once (a minion that
 * came and fell meanwhile, not at all).
 */
export function skim(events: SimEvent[]): void {
  const came = new Set(events.flatMap((event) => (event.kind === 'foe-enter' ? [event.foe] : [])));
  const gone = new Set(events.flatMap((event) => (event.kind === 'foe-down' && came.has(event.foe) ? [event.foe] : [])));
  const kept = events.filter((event) => STANDING.has(event.kind) && !((event.kind === 'foe-enter' || event.kind === 'foe-down') && gone.has(event.foe)));
  events.splice(0, events.length, ...kept);
}

/** A body on the field: a hero, by its index among the fighters, or the boss. */
type Who = number | 'boss';

/** How far apart the heroes stand in a row as the fight is over (celebrate()). */
const ROW = 2.7;

export interface FightView {
  /** What each blow took and each heal gave since the page last looked, for it to show coming off whom it was (the page empties it). */
  readonly numbers: Popup[];
  /** Where a hero stands on the field, and its head (for its health bar and its picture). */
  place(who: number, into: Vector3): Vector3;
  head(who: number, into: Vector3): Vector3;
  /** Whether a hero is drawn on the field. */
  shown(who: number): boolean;
  /** How far along the field the camera is to be moved from where it stands (less than 0: to the left): following a raid's run up to the boss. */
  readonly pan: number;
  /** How dark the field is to be drawn (0 not at all, 1 black), and the body kept bright in it: the one whose skill's blow has just landed (null: none). */
  readonly dark: number;
  readonly lit: Object3D | null;
  /**
   * The boss winding up a skill (one of its look's `skills`): its name, and how far it is to its first blow landing (0 to 1);
   * and over its head, put in `into`, for the red bar King's Raid shows there meanwhile. Null: it isn't.
   */
  readonly charging: { name: string; share: number } | null;
  bossHead(into: Vector3): Vector3;
  /** Over the head of an enemy not the boss (a minion, by its index among the sim's enemies), put in `into`; null for one not on the field. */
  foeHead(foe: number, into: Vector3): Vector3 | null;
  /** Draws what the sim says has happened since last time, and moves everything on by `dt` seconds. */
  update(now: number, dt: number): void;
  /**
   * The fight over: these heroes (`who`) stand in a row about `at`, facing the camera, and strike their victory pose (`won`) or
   * their loss's; everyone else, and the boss, is taken off the field. Only they go on moving from then.
   */
  celebrate(who: readonly number[], won: boolean, at: Vector3): void;
  /** Takes the heroes off the field (the fight is done with). */
  clear(): void;
}

/** A fight drawn in `scene`: the sim's, its heroes' `bodies` (by their index among its fighters) and the boss's. */
export function makeFightView({
  scene,
  sim,
  bodies,
  boss,
  bossLook,
  bossFx,
  effects,
  kr,
  magic,
  props,
  banners,
  minions,
  slide,
}: {
  scene: Scene;
  sim: Sim;
  bodies: readonly Hero[];
  boss: Boss;
  bossLook: BossLook;
  bossFx: BossFx;
  effects: Effects;
  kr: KrEffects;
  magic: Magic;
  props: Props;
  banners: Banners;
  /** The minions of the boss's raid's waves (./minions.ts); and the map moved on to the next wave's platform, over so many seconds. */
  minions: Minions;
  slide: (seconds: number) => void;
}): FightView {
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
  /** Each minion's kind, and the move it began last (whose blows are landing), by its index among the sim's enemies. */
  const foeKinds = new Map<number, string>();
  const foeMoves = new Map<number, 'attack' | 'skill'>();
  /** The heroes standing in a row as the fight is over (celebrate()): null while it goes on. */
  let celebrating: readonly number[] | null = null;

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
  /** How tall each hero stands at rest (what guards it is made to fit it). */
  const heights = bodies.map((hero) => hero.height());
  /** What each hero is drawn with, as it is solid (to make it see-through, and solid again); and how solid each is drawn now. */
  const solid = bodies.map((hero) => {
    const all = new Map<Material, { opacity: number; alphaTest: number; transparent: boolean }>();
    hero.root.traverse((o) => {
      if (isMesh(o)) for (const material of [o.material].flat()) all.set(material, { opacity: material.opacity, alphaTest: material.alphaTest, transparent: material.transparent });
    });
    return all;
  });
  const solidity = bodies.map(() => 1);
  /** Draws a hero `k` as solid (1 as it is). What is cut out where it isn't solid is cut by as much less, or it would be cut out altogether. */
  const see = (who: number, k: number): void => {
    if (solidity[who] === k) return;
    solidity[who] = k;
    for (const [material, was] of solid[who] ?? []) {
      material.opacity = was.opacity * k;
      material.alphaTest = was.alphaTest * k;
      const transparent = was.transparent || k < 1;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
    }
  };

  const fx: FxScene = {
    effects,
    magic,
    props,
    bossHit,
    bossFeet,
    place: (who, into) => body(who).place(into),
    head: (who, into) => body(who).head(into),
    leftHand: (who, into) => body(who).leftHand(into),
    rightHand: (who, into) => body(who).rightHand(into),
    floater: (who, into) => body(who).floater?.(into) ?? body(who).head(into),
    muzzle: (who, into) => body(who).muzzle?.(into) ?? body(who).head(into),
  };
  const fxOf = (who: number) => HERO_FX[(sim.fighters[who] as Sim['fighters'][number]).id];
  const wards = makeWards(scene, props);
  /** The skills of the heroes in the fight that guard a hero with a look of their own: by the status's name, its look. */
  const looks = new Map<string, Emblem>();
  for (const fighter of sim.fighters)
    for (const [status, name] of Object.entries(HERO_FX[fighter.id]?.wards ?? {})) looks.set(status, { hero: lookOf(fighter.id).assets, name });
  /** The skills of the heroes in the fight that put the bubble on a hero as a shield does: by the status's name. */
  const bubbles = new Set(sim.fighters.flatMap((fighter) => HERO_FX[fighter.id]?.bubbles ?? []));
  /** What is heard: the heroes' blows and skills, the boss's attacks, and the raid's music. */
  const sounds = makeFightSounds(sim.fighters.map((fighter) => lookOf(fighter.id).assets), bossLook.assets);
  /** King's Raid's own effects for the heroes' moves. */
  const krMoves = makeKrMoves(
    kr,
    sim.fighters.map((fighter) => lookOf(fighter.id).assets),
    bodies,
    bossHit,
  );
  const krBoss = makeKrBoss(kr, bossLook.assets, boss.root, bodies);
  const emblems: Emblem[] = [];
  // The signs of what comes on a fighter: the game's own (a hero's on it, the boss's where its blows land, bigger).
  const signs = makeSigns(effects, (who, sign) => {
    const code = KR_SIGNS[sign];
    if (!code) return false;
    if (who < 0) kr.play(code, { at: bossHit, scale: BOSS_SIGN });
    else kr.play(code, { on: body(who).root, scale: SCALE });
    return true;
  });
  kr.read(SIGN_EFFECTS);
  const over = new Vector3();
  /** The heroes doing one of their skills (not their attack); and the hero whose skill's blow landed last (null: the last was no skill's). */
  const skilling = new Set<number>();
  let skillBlow: number | null = null;
  /** How long until the boss's skills going are done (none: 0). */
  let bossSkill = 0;
  /** The hit-stop: how long the field is still to hold still, whose skill's blow it is, and how dark the field is. */
  let held = 0;
  let caster: Who | null = null;
  let dark = 0;
  /** How much of a raid's run up to the boss has been drawn (seconds): kept smooth between the sim's steps, but never more than one from it. */
  let ran = 0;
  /** How far behind the fight each body held still is, to catch up. */
  const behind = new Map<Who, number>();
  const stop = (who: Who): void => {
    held = STOP;
    caster = who;
    dark = DARK;
  };
  /** How far a body moves on this frame: not at all while the field holds still (but the caster), then faster until it has caught up. */
  const step = (who: Who, dt: number, holding: boolean): number => {
    const late = behind.get(who) ?? 0;
    if (holding && who !== caster) {
      behind.set(who, late + dt);
      return 0;
    }
    if (late <= 0) return dt;
    const back = Math.min(late, dt * MAKE_UP);
    if (late > back) behind.set(who, late - back);
    else behind.delete(who);
    return dt + back;
  };
  /** How long one of the boss's attacks takes before its first blow lands (its first part's moves up to it: none, its whole length). */
  const windup = (attack: string): number => {
    const { plans, moves } = sim.boss.def as BossDef;
    let first = Infinity;
    const parts = new Map<string, number>();
    for (const [move, by, after] of plans[attack] ?? []) {
      const from = (parts.get(by) ?? 0) + after;
      const one = moves[move];
      if (one?.hit !== null && one?.hit !== undefined) first = Math.min(first, from + one.hit);
      parts.set(by, from + (one?.length ?? 0));
    }
    return Number.isFinite(first) ? first : Math.max(0, ...parts.values());
  };
  /** The skill the boss is winding up: its name, how far in (its own time), and how long until its first blow. */
  let charge: { name: string; t: number; until: number } | null = null;
  /** How long one of the boss's attacks takes, all its parts' moves done, as slow as it is now. */
  const lasts = (attack: string): number => {
    const { plans, moves } = sim.boss.def as BossDef;
    const parts = new Map<string, number>();
    for (const [move, by, after] of plans[attack] ?? []) parts.set(by, (parts.get(by) ?? 0) + after + (moves[move]?.length ?? 0));
    return Math.max(0, ...parts.values()) / (sim.boss.slowed > 0 ? sim.boss.slowRate : 1);
  };

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
    get pan() {
      return sim.raid ? -FOLLOW * MARCH_FROM * marchLeft(ran / MARCH) : 0;
    },
    get dark() {
      return dark;
    },
    get lit() {
      if (dark <= 0 || caster === null) return null;
      if (caster === 'boss') return boss.root;
      return on.has(caster) ? body(caster).root : null;
    },
    update(now, dt) {
      if (celebrating) {
        for (const who of celebrating) body(who).update(now, dt);
        kr.update(dt);
        return;
      }
      const marched = Math.min(MARCH, sim.tick * TICK);
      ran = Math.min(MARCH, marched + TICK, Math.max(marched - TICK, ran + dt));
      skillBlow = null;
      bossSkill = Math.max(0, bossSkill - dt);
      for (const event of sim.events.splice(0)) {
        switch (event.kind) {
          case 'enter': {
            const hero = body(event.who);
            const fighter = sim.fighters[event.who] as Sim['fighters'][number];
            hero.root.position.set(fighter.x, 0, fighter.z);
            scene.add(hero.root);
            on.add(event.who);
            hero.enter(event.run);
            break;
          }
          case 'leave': {
            const { root } = body(event.who);
            scene.remove(root);
            on.delete(event.who);
            // Put on again, it stands, solid.
            fallen.delete(event.who);
            see(event.who, 1);
            root.rotation.x = 0;
            root.position.y = 0;
            break;
          }
          case 'start':
            body(event.who).start(event.move);
            sounds.start(event.who, event.move, event.skill);
            if (event.skill) skilling.add(event.who);
            else skilling.delete(event.who);
            // The game's own effects for it; a skill with none: a ring rises round its feet as it begins.
            if (!krMoves.start(event.who, event.move) && event.skill) {
              body(event.who).place(at).y = 0.05;
              effects.play('cast', at);
            }
            break;
          case 'stagger':
          case 'revive':
            skilling.delete(event.who);
            body(event.who).stagger();
            break;
          case 'land':
            skillBlow = skilling.has(event.who) ? event.who : null;
            // The game's own effects for it, or what is drawn here for it.
            if (!krMoves.land(event.who, event.move)) (fxOf(event.who)?.lands?.[event.move] ?? COMMON_FX.lands?.[event.move])?.(fx, event.who, event.part);
            sounds.land(event.who, event.move, event.part);
            break;
          case 'hurt':
            if (bossSkill > 0) stop('boss');
            // Blocked: a ring round it, and no flinch.
            if (event.blocked) magic.ring(body(event.who).place(at), 0xffe9a8, 7, 0.4);
            else body(event.who).hit();
            // (The boss's own sound and effect for a blow of its; a minion's, its own.)
            if (event.by === undefined) {
              sounds.hurt();
              krBoss.hurt(event.who);
            } else sounds.minion(foeKinds.get(event.by) ?? '', foeMoves.get(event.by) === 'skill' ? 'hitSkill' : 'hitAttack');
            break;
          case 'number': {
            // (On a minion: over its head.)
            const minion = event.on === 'boss' && event.foe ? minions.head(event.foe, new Vector3()) : null;
            const where = minion ?? (event.on === 'boss' ? bossHit.clone().setY(bossHit.y + (event.mend ? 1.4 : 0.6)) : body(event.on).head(new Vector3()));
            numbers.push({ amount: event.amount, kind: event.type, at: where, ...(event.magical && { magical: true }) });
            if (event.type === 'heal' && event.on !== 'boss' && on.has(event.on)) signs.healed(event.on, body(event.on).place(over).setY(0.1));
            break;
          }
          case 'cue':
            if (event.who === null) bossFx[event.name]?.(fx, event.targets);
            else fxOf(event.who)?.cues?.[event.name]?.(fx, event.who, event.targets);
            break;
          case 'boss-use':
            boss.use(event.attack);
            sounds.use(event.attack);
            krBoss.use(event.attack);
            if (bossLook.skills?.includes(event.attack)) {
              bossSkill = Math.max(bossSkill, lasts(event.attack));
              const until = windup(event.attack);
              const label = (sim.boss.def as BossDef).attacks.find((one) => one.name === event.attack)?.label ?? event.attack;
              charge = until > 0.3 ? { name: label, t: 0, until } : null;
            }
            break;
          case 'boss-hit':
            if (event.foe) {
              minions.hit(event.foe);
              sounds.minion(foeKinds.get(event.foe) ?? '', 'hurt');
              break;
            }
            boss.hit();
            if (skillBlow !== null) stop(skillBlow);
            break;
          case 'boss-daze':
            charge = null;
            boss.daze(event.seconds, event.down);
            if (event.down) sounds.down();
            signs.dazed(bossHit);
            break;
          case 'boss-slow':
            boss.slow(event.rate, event.seconds);
            signs.slowed(bossHit);
            break;
          // A raid of more than one wave: the boss flies off, and lands back; the heroes run on to the next (the map moving
          // past them), its banner over the field; what is there comes onto it, fights, and falls.
          case 'boss-leave':
            charge = null;
            boss.leave?.();
            break;
          case 'boss-return':
            boss.arrive?.();
            break;
          case 'wave':
            for (const who of on) if ((sim.fighters[who]?.hp ?? 0) > 0) body(who).jog?.(RUN_ON);
            slide(RUN_ON);
            banners.play(event.wave === 2 ? 'stage2' : 'stage3');
            break;
          case 'foe-enter':
            foeKinds.set(event.foe, event.minion);
            minions.enter(event.foe, event.minion, event.x, event.z);
            break;
          case 'foe-use':
            foeMoves.set(event.foe, event.move);
            minions.use(event.foe, event.move);
            sounds.minion(foeKinds.get(event.foe) ?? '', event.move);
            break;
          case 'foe-daze':
            minions.daze(event.foe, event.seconds);
            break;
          case 'foe-down':
            sounds.minion(foeKinds.get(event.foe) ?? '', 'down');
            minions.down(event.foe);
            break;
          case 'end':
            sounds.end(event.result === 'won');
            banners.play('finish');
            break;
        }
      }

      // (Held still from the frame a skill's blow lands, but for whose skill it is.)
      const holding = held > 0;
      held = Math.max(0, held - dt);
      if (!holding) dark = Math.max(0, dark - (dt * DARK) / LIGHTEN);
      boss.update(now, step('boss', dt, holding));
      // Each hero on the field where the sim has it, moving as fast as it does (its attack speed, and what quickens it).
      // One fallen goes over onto its back and lies still there; revived, it gets up again.
      for (const who of on) {
        const fighter = sim.fighters[who] as Sim['fighters'][number];
        const hero = body(who);
        const moved = step(who, dt, holding);
        hero.root.position.x = fighter.x;
        hero.root.position.z = fighter.z;
        // What guards it: a shield, and what else has a look of its own.
        emblems.length = 0;
        for (const status of [...fighter.statuses, ...sim.party]) {
          const look = looks.get(status.name);
          if (look) emblems.push(look);
        }
        const shielded = fighter.shield > 0 || fighter.statuses.some((status) => bubbles.has(status.name));
        wards.keep(who, hero.place(at), heights[who] as number, shielded, fighter.hp > 0 ? emblems : []);
        if (fighter.hp > 0) signs.hero(who, [...fighter.statuses, ...sim.party], () => hero.head(over));
        // Hidden: see-through.
        const hidden = fighter.hp > 0 && fighter.statuses.some((status) => HIDING.has(status.name));
        const fading = (dt * (1 - HIDDEN)) / FADE;
        const seen = solidity[who] as number;
        see(who, hidden ? Math.max(HIDDEN, seen - fading) : Math.min(1, seen + fading));
        const down = fighter.hp <= 0;
        let lying = fallen.get(who);
        if (down && !lying) {
          hero.fall();
          lying = { over: 0, still: null };
          fallen.set(who, lying);
        }
        // (One that falls by its own animation is left as that has it, going on.)
        if (lying && hero.falls) {
          hero.update(now, moved);
          // (Revived: up again, through its being hurt.)
          if (!down) {
            hero.stagger();
            fallen.delete(who);
          }
          continue;
        }
        if (!lying) {
          hero.update(now, sim.result ? 0 : moved * fighter.haste);
          continue;
        }
        lying.over = Math.min(1, Math.max(0, lying.over + (down ? moved : -moved) / FALL.time));
        if (down && lying.over >= 1) lying.still ??= now;
        else lying.still = null;
        // Going over faster and faster, as a body falls.
        const k = lying.over * lying.over;
        hero.root.rotation.x = (-Math.PI / 2) * k;
        hero.root.position.y = FALL.lift * k;
        hero.update(lying.still ?? now, lying.still === null ? moved : 0);
        if (!down && lying.over <= 0) fallen.delete(who);
      }
      signs.boss(sim.boss.statuses, bossHit);
      wards.update(dt);
      signs.update(dt);
      effects.update(dt);
      krBoss.update();
      minions.update(dt);
      // (Its wind-up goes as fast as it does: slowed, slower.)
      if (charge) {
        charge.t += dt * (sim.boss.slowed > 0 ? sim.boss.slowRate : 1);
        if (charge.t >= charge.until) charge = null;
      }
      kr.update(dt);
      magic.update(dt);
      props.update(dt);
    },
    celebrate(who, won, at) {
      celebrating = who;
      for (const one of on) if (!who.includes(one)) body(one).root.visible = false;
      boss.root.visible = false;
      wards.clear();
      signs.clear();
      kr.clear();
      who.forEach((one, i) => {
        const hero = body(one);
        const { root } = hero;
        if (!root.parent) scene.add(root);
        root.visible = true;
        see(one, 1);
        root.position.set(at.x + (i - (who.length - 1) / 2) * ROW, 0, at.z);
        root.rotation.set(0, 0, 0, 'YXZ');
        hero.pose?.(won ? 'victory' : 'lose');
      });
      // The first of them speaks for them all.
      if (won && who[0] !== undefined) sounds.victory(who[0]);
    },
    foeHead: (foe, into) => minions.head(foe, into),
    get charging() {
      return charge && { name: charge.name, share: Math.min(1, charge.t / charge.until) };
    },
    bossHead: (into) => into.copy(bossHit).setY(bossHit.y + 2.2),
    clear() {
      charge = null;
      minions.clear();
      celebrating = null;
      boss.reset?.();
      boss.root.visible = true;
      for (const hero of bodies) hero.root.visible = true;
      for (const who of on) {
        const { root } = body(who);
        scene.remove(root);
        root.rotation.x = 0;
        root.position.y = 0;
        see(who, 1);
      }
      on.clear();
      fallen.clear();
      skilling.clear();
      behind.clear();
      held = dark = bossSkill = 0;
      caster = null;
      wards.clear();
      signs.clear();
      props.clear();
      sounds.stop();
      kr.clear();
    },
  };
}

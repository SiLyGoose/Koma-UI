import { music, preload, sound, type Stop } from '../../shared/audio';
import { musicFile, soundFile, type BossAssets, type GameSound, type HeroAssets } from '../assets';

/*
 * What is heard in a fight, King's Raid's own (the heroes' and the boss's asset files' `sounds`, and its `music`):
 * a hero's blow landing and a hero's skill beginning; the boss's attack beginning, its blow landing on a hero, it
 * knocked down and falling; and the raid's music. All through the shared ../../shared/audio/sfx.ts (its volume, and
 * the frame's sound button). Only the fight's heroes' and boss's files are read, each once however many share it
 * (and however many fights: sfx.ts keeps each it has read), in a room ahead of the fight (readSounds()).
 */

/** How loud the heroes are, the boss, and the music (each a share of the shared volume), before the game's own volume for each sound. */
const VOLUME = 0.1;
const BOSS = 0.1;
const MUSIC = 0.1;
/** The same clip again within this many seconds isn't played: a whole raid's blows can land together. */
const APART = 0.05;
/** How long the music takes to fade out, as the fight ends and as it is taken off. */
const FADE = { end: 3, off: 0.5 };

export interface FightSounds {
  /** The `part`-th blow of a hero's `move` lands (`who`: its index among the fighters). */
  land(who: number, move: string, part: number): void;
  /** A hero begins a move (`skill`: one of its skills). */
  start(who: number, move: string, skill: boolean): void;
  /** The boss begins one of its attacks (by its name). */
  use(attack: string): void;
  /** A blow of the boss's lands on a hero (of the attack it began last). */
  hurt(): void;
  /** The boss is knocked down. */
  down(): void;
  /** The fight is over (`won`: the boss has fallen): the music fades away. */
  end(won: boolean): void;
  /** The fight is taken off the page: the music stops. */
  stop(): void;
}

/** Every file a hero's sounds play. */
const heroFiles = (hero: HeroAssets): string[] =>
  [...Object.values(hero.sounds?.hits ?? {}).flat(), ...Object.values(hero.sounds?.casts ?? {})].flatMap((list) => list.map((clip) => soundFile(hero, clip)));

/** Every file a boss's sounds play (not its music). */
const bossFiles = (boss: BossAssets): string[] => {
  const { uses = {}, hits = {}, down, dead } = boss.sounds ?? {};
  return [...Object.values(uses), ...Object.values(hits), down ?? [], dead ?? []].flatMap((list) => list.map((clip) => soundFile(boss, clip)));
};

/** Starts loading a hero's sounds, or a boss's and its music, before its fight (in a room, as it's picked: the fight then begins with them in). */
export function readSounds(owner: { hero: HeroAssets } | { boss: BossAssets }): void {
  const urls = 'hero' in owner ? heroFiles(owner.hero) : [...bossFiles(owner.boss), ...(owner.boss.music ? [musicFile(owner.boss.music.file)] : [])];
  for (const url of new Set(urls)) preload(url);
}

/** The sounds of a fight of `heroes` (by their index among the fighters) against `boss`. */
export function makeFightSounds(heroes: readonly HeroAssets[], boss: BossAssets): FightSounds {
  const clips = new Map<string, (volume?: number) => void>();
  for (const url of [...heroes.flatMap(heroFiles), ...bossFiles(boss)]) if (!clips.has(url)) clips.set(url, sound(url));
  const { uses = {}, hits = {}, down, dead } = boss.sounds ?? {};

  const last = new Map<string, number>();
  const play = (url: string, volume: number): void => {
    const now = performance.now() / 1000;
    if (now - (last.get(url) ?? -Infinity) < APART) return;
    last.set(url, now);
    clips.get(url)?.(volume);
  };
  /** Plays `list` of `owner`'s, each clip as far in as it comes. */
  const hear = (owner: { folder: string }, list: GameSound | undefined, loudness: number): void => {
    // (Not while the page is away: coming back, the fight catches up all at once.)
    if (!list || document.hidden) return;
    for (const clip of list) {
      const url = soundFile(owner, clip);
      const volume = loudness * (clip.volume ?? 1);
      if (clip.at) setTimeout(() => play(url, volume), clip.at * 1000);
      else play(url, volume);
    }
  };

  const tune = boss.music ? music(musicFile(boss.music.file), boss.music.loop) : null;
  let stopMusic: Stop | null = tune ? tune(MUSIC) : null;
  const quiet = (fade: number): void => {
    stopMusic?.(fade);
    stopMusic = null;
  };
  /** The attack the boss began last (whose blows are landing). */
  let attack = '';

  return {
    land(who, move, part) {
      const hero = heroes[who];
      const blows = hero?.sounds?.hits?.[move];
      if (hero && blows && blows.length > 0) hear(hero, blows[part % blows.length], VOLUME);
    },
    start(who, move, skill) {
      const hero = heroes[who];
      if (hero && skill) hear(hero, hero.sounds?.casts?.[move], VOLUME);
    },
    use(name) {
      attack = name;
      hear(boss, uses[name], BOSS);
    },
    hurt() {
      hear(boss, hits[attack], BOSS);
    },
    down() {
      hear(boss, down, BOSS);
    },
    end(won) {
      if (won) hear(boss, dead, BOSS);
      quiet(FADE.end);
    },
    stop() {
      quiet(FADE.off);
    },
  };
}

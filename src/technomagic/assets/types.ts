/*
 * What the files the page shows are, by whose they are: a hero's (its skins' models, its skills'
 * pictures, its portraits), a boss's, or an effect's. Named here and nowhere else; ./paths.ts says where
 * each is kept.
 */

/** A square of a picture: `size` of its pixels across, from x, y. */
export interface Crop {
  x: number;
  y: number;
  size: number;
}

/**
 * A skin's picture for its card: a file, and the square of it that is the hero's head and a little
 * more. It is kept with the page (public/technomagic/portraits/) unless it says where it is fetched
 * `from`: then under its hero's folder in public/kr/, with the models.
 */
export interface Portrait {
  file: string;
  crop: Crop;
  /** The meter's close-up of its face, where `crop` takes in more than the face (ears, hair) or the face is small in it: by itself, square. Missing: `crop`. */
  head?: Crop;
  from?: string;
}

/**
 * King's Raid's own animations for a skin of its files, each a file under its hero's animations/ (by the clip's name in
 * the game: Idle, Skill1, Attack1-2…; made from the game's files by KR-extracted/scripts/kr-anims.py): its idle and its
 * run, being staggered, and its attack and skills. Each move is fitted to how the fight times it (../sim/motion.ts),
 * its blows landing when the fight's do.
 */
export interface KrAnimations {
  idle: string;
  run: string;
  hurt?: string;
  /** Its attack's parts, as the fight times them (as many). */
  attack?: readonly KrMove[];
  /** Its skills', by the move's name. */
  skills?: Readonly<Record<string, KrMove>>;
}

/** A move of the game's: its clips, played one after another, and the moments its blows land in them (seconds into the first, as the game has them). */
export interface KrMove {
  clips: readonly string[];
  hits: readonly number[];
}

/** Where something is held in a hand, in that hand's own axes (its bone's): how far from it, and how it is turned (about x, y and z, in that order, in radians). */
export interface Grip {
  at: readonly [number, number, number];
  turn: readonly [number, number, number];
}

/**
 * A model of the game's own files: the parts on its skeleton (each a folder among its hero's models,
 * holding one .fbx of its own name and the textures it uses), and what goes in each hand.
 */
export interface PartsModel {
  kind: 'parts';
  parts: readonly string[];
  left?: string;
  right?: string;
  /** What is in its left hand: a shield (when it doesn't say), kept facing ahead whatever its arm does, or something it just holds. */
  offHand?: 'shield' | 'held';
  /** Which of its own axes the weapon in its right hand runs along (x when it doesn't say). */
  blade?: 'x' | 'y';
  /**
   * How its hands hold what is in them, where its body's file marks them somewhere else (Seria's: at its feet, where
   * the game's own animations move them from): by the side (L, R).
   */
  grips?: { L?: Grip; R?: Grip };
  /**
   * The hands whose mark King's Raid's own animations move somewhere other than where it holds what is in it (Valance's
   * right: where her shots start, above her): kept in the hand, as its grip has it.
   */
  heldStill?: readonly ('L' | 'R')[];
  /**
   * What floats beside it, in no hand (a body whose file marks no hand to hold it): `at` where, in its model's
   * own lengths from the floor under it (x to its left, y up, z ahead), `size` times as big as it comes. It
   * goes along with it and up with it, but is kept upright whatever it does.
   */
  floating?: { model: string; at: readonly [number, number, number]; size: number };
  /**
   * Its parts drawn with another model's textures in place of their own: a texture of `from` (a model among its
   * parts, whose files name its pictures after it) is drawn with the same picture of `to` (another of its hero's
   * models, on the same layout), from that model's folder.
   */
  repaint?: { from: string; to: string };
  /** King's Raid's own animations for it (../heroes/body/kr.ts): without them on this computer, it is moved by the poses written in code. */
  animations?: KrAnimations;
}

/** A skin: what a hero looks like on the field and on its card. Each has a card of its own. */
export interface SkinAssets {
  /** What it is known by: the hero's own name for its default skin. */
  name: string;
  /** With none it is pictured as it stands on the field. */
  portrait?: Portrait;
  model: PartsModel;
}

/** A hero's files: its folder under public/kr/, its skills' pictures, and its skins. */
export interface HeroAssets {
  name: string;
  folder: string;
  /** The pictures on its skills, in their order, its passive last: files fetched once from where they are published. */
  skills: { from: string; files: readonly string[] };
  skins: readonly SkinAssets[];
  /** What its skills bring onto the field (Lorraine's vines), by the name its fx know it by: each a folder among its models. */
  props?: Readonly<Record<string, string>>;
  /**
   * Its unique weapon, as it looks wielded: each model of its skins' (by its folder) that it is drawn with instead, a
   * folder among its models (its weapon's: in the same hand, or on the same skeleton). A skin with none of them looks the same with it.
   */
  unique?: Readonly<Record<string, string>>;
  /**
   * King's Raid's sounds for it: as each blow of its moves lands (`hits`, by the move: its attack's, its skills'; the
   * blows' sounds in turn, the n-th part of the move playing the n-th, round again past the last), and as each of its
   * skills begins (`casts`, by the move). A move with none is unheard.
   */
  sounds?: { hits?: Readonly<Record<string, readonly GameSound[]>>; casts?: Readonly<Record<string, GameSound>> };
  /**
   * King's Raid's own effects for its moves, by the move (../fx/kr-effects.ts: codes of public/kr/effects/kr/): played on
   * it as the move begins (`start`: of those numbered, Casting1…, one each time, in turn), and as each of its blows lands
   * (`land`: where it lands; a shot's, at it; a projectile's, not at all).
   */
  vfx?: Readonly<Record<string, { start?: readonly string[]; land?: readonly string[] }>>;
}

/**
 * Something heard, as the game has it: one or more clips, each `at` seconds after it begins (0 when it doesn't say)
 * and `volume` times as loud as recorded (1 when it doesn't say). A clip is a file under public/kr/effects/sounds/
 * (the ones every hero and boss shares), or (`own`) under its owner's folder, in sounds/ (its voice).
 */
export type GameSound = readonly SoundClip[];
export interface SoundClip {
  clip: string;
  volume?: number;
  at?: number;
  own?: boolean;
}

/** A boss's files: its folder under public/kr/, and the models it is put together from. */
export interface BossAssets {
  name: string;
  folder: string;
  models: readonly string[];
  /**
   * King's Raid's sounds for it: as each of its attacks begins (`uses`, by the attack's name), as a blow of one lands
   * on a hero (`hits`), as it is knocked down, and as it falls.
   */
  sounds?: { uses?: Readonly<Record<string, GameSound>>; hits?: Readonly<Record<string, GameSound>>; down?: GameSound; dead?: GameSound };
  /** The music its raid plays, King's Raid's: a file under public/technomagic/music/, played over and over, from its start again `loop` seconds in. */
  music?: { file: string; loop: number };
  /** King's Raid's own animations for it (../bosses/kr.ts). */
  animations?: KrBossAnimations;
  /**
   * King's Raid's own effects for it (../fx/kr-effects.ts: codes of public/kr/effects/kr/): for each of its attacks, played
   * on it as the attack begins (`start`) and on each hero as a blow of it lands (`hit`); and as it first comes on the field (`advent`).
   */
  vfx?: { attacks: Readonly<Record<string, { start?: readonly string[]; hit?: readonly string[] }>>; advent?: readonly string[] };
}

/**
 * King's Raid's own animations for a boss, each a file under its animations/ (as KrAnimations' are): its idle, going
 * down and getting up again (knocked down), and each of its attacks (by the attack's name), fitted to how the fight times it.
 */
export interface KrBossAnimations {
  idle: string;
  down?: string;
  getUp?: string;
  attacks: Readonly<Record<string, KrMove>>;
}

/**
 * An effect: flat pictures that play once where a hit lands (../fx/effects.ts), white on black, drawn as
 * light in `tint` and `size` times as big as they come. One that lies on the floor or stands up off it (`flat`:
 * a magic circle, a shaft of light) is drawn among what is on the field, not over it, and isn't turned to the
 * camera; one whose file plays on for longer than it is wanted stays only `lasts` seconds. A picture of its file's
 * that isn't drawn as the game would here (`without`, by its mesh's name: one the game fades out as it grows over the
 * whole screen, which drawn here lights it all) is left out.
 */
export interface EffectAssets {
  folder: string;
  tint: number;
  size: number;
  flat?: boolean;
  lasts?: number;
  without?: readonly string[];
}

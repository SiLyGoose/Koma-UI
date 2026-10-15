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
 * `from`: then under its hero's folder in public/kr/, which git ignores and a build leaves out.
 */
export interface Portrait {
  file: string;
  crop: Crop;
  /** The meter's close-up of its face, where `crop` takes in more than the face (ears, hair) or the face is small in it: by itself, square. Missing: `crop`. */
  head?: Crop;
  from?: string;
}

/**
 * A model rigged and animated outside the game's files (by Mixamo): one .fbx for each animation, each
 * holding the whole model, in `folder` among its hero's models. A rig read only for some of its skills
 * (what moves a skin of the game's own files: PartsModel.movedBy) may have no idle or run: its skin then
 * stands, runs in and does everything else by the poses written in code. With an idle and no run, it stands
 * in that idle, and does the rest by the poses written in code.
 */
export interface RiggedModel {
  kind: 'rigged';
  folder: string;
  idle?: string;
  run?: string;
  /**
   * Its attack, when it has one of its own: animations played one after another. Of each: the moments
   * (seconds into it) its blows land, and when to leave it for the next, its last swing done.
   */
  attack?: readonly { file: string; lands: readonly number[]; until: number }[];
  /**
   * Animations its skills are played with, by the name of the move each would otherwise be (one with
   * none here is the move written in code): the moments its blows land, and when to leave it (written down,
   * not read from the file, so the fight goes the same on a computer without it: ../sim/motion.ts).
   */
  skills?: Readonly<Record<string, { file: string; lands: readonly number[]; until: number }>>;
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
  /**
   * What moves it, its files having no animation: another of its hero's skins that comes with its
   * animations (by name), or a rig read for its animations alone, which has no card of its own. With
   * neither (or with it not on this computer) it is moved by the poses written in code.
   */
  movedBy?: string | RiggedModel;
}

/** A skin: what a hero looks like on the field and on its card. Each has a card of its own. */
export interface SkinAssets {
  /** What it is known by: the hero's own name for its default skin. */
  name: string;
  /** With none it is pictured as it stands on the field. */
  portrait?: Portrait;
  model: PartsModel | RiggedModel;
}

/** A hero's files: its folder under public/kr/, its skills' pictures, and its skins. */
export interface HeroAssets {
  name: string;
  folder: string;
  /** The pictures on its skills, in their order, its passive last: files fetched once from where they are published. */
  skills: { from: string; files: readonly string[] };
  skins: readonly SkinAssets[];
}

/** A boss's files: its folder under public/kr/, and the models it is put together from. */
export interface BossAssets {
  name: string;
  folder: string;
  models: readonly string[];
}

/**
 * An effect: flat pictures that play once where a hit lands (../fx/effects.ts), white on black, drawn as
 * light in `tint` and `size` times as big as they come.
 */
export interface EffectAssets {
  folder: string;
  tint: number;
  size: number;
}

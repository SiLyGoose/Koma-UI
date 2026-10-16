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
 * holding the whole model, in `folder` among its hero's models (or among another's, `of` that hero's
 * folder: a rig borrowed whole). A rig read only for some of its skills
 * (what moves a skin of the game's own files: PartsModel.movedBy) may have no idle or run: its skin then
 * stands, runs in and does everything else by the poses written in code. With an idle and no run, it stands
 * in that idle, and does the rest by the poses written in code; with a run and no idle, it runs in in that run.
 * Its first file holds the model (or, for a rig that moves a skin of the game's own files, its skeleton alone).
 * Each of the others may be on a skeleton of its own (another hero's, copied; or a file of the motion alone).
 */
export interface RiggedModel {
  kind: 'rigged';
  folder: string;
  of?: string;
  idle?: string;
  run?: string;
  /**
   * Running in its run with no idle (a skin of the game's own files, posed in code otherwise): the way the blade in
   * its right hand is held pointing, in its model's axes (x to its left, y up, z ahead), whatever the run has its hand do.
   */
  bladeRunning?: readonly [number, number, number];
  /**
   * Its attack, when it has one of its own: animations played one after another, each timed as its hero's attack's
   * part is in the fight (../sim/heroes/: HeroDef.timing, never read from the file, so the fight goes the same on a
   * computer without it).
   */
  attack?: readonly { file: string }[];
  /**
   * Its attack goes straight on into the next (a skin of the game's own files, with no idle): as one ends it is eased
   * from where that leaves it to where its attack begins, ready for the next, not back to how it stands (unless none comes).
   */
  chained?: boolean;
  /**
   * What is in its right hand is loosed (an arrow; a skin of the game's own files, with no idle): gone from its hand as
   * each move played by these animations lands its first blow (the shot), and back as it reaches to draw again: `nock`
   * seconds into its attack's animation, or as a skill played by these begins (drawn already).
   */
  loosed?: { nock: number };
  /**
   * Animations its skills are played with, by the name of the move each would otherwise be (one with none here is
   * the move written in code), each timed as its hero's skill is in the fight (HeroDef.timing).
   */
  skills?: Readonly<Record<string, SkillAnimation>>;
}

/**
 * An animation a skill is played with: its file. One may be a file of the game's own (`folder`: one of its hero's models,
 * its whole model on the game's skeleton: a cutscene's), made over from that skeleton, and only a `span` of it played
 * (seconds into the file, from and to), drawn out (or hurried) to last as long as the fight has the skill take.
 */
export interface SkillAnimation {
  file: string;
  folder?: string;
  span?: readonly [number, number];
  /** Played crouched (its hips this much lower, in its model's lengths, its feet where they were) and aimed up (its chest leant back this far, radians). */
  crouch?: number;
  aimUp?: number;
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
  /** What its skills bring onto the field (Lorraine's vines), by the name its fx know it by: each a folder among its models. */
  props?: Readonly<Record<string, string>>;
  /**
   * Its unique weapon, as it looks wielded: each model of its skins' (by its folder) that it is drawn with instead, a
   * folder among its models (its weapon's: in the same hand, or on the same skeleton). A skin with none of them looks the same with it.
   */
  unique?: Readonly<Record<string, string>>;
}

/** A boss's files: its folder under public/kr/, and the models it is put together from. */
export interface BossAssets {
  name: string;
  folder: string;
  models: readonly string[];
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

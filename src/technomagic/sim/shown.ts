/*
 * What the fight says the page is to show, as the fight has it: the page draws each its own way (../hud/). Nothing
 * here says where a picture is kept: Art only says whose it is, and ../art.ts finds it.
 */

/**
 * A picture the page shows for something of the fight's: one of a hero's skills' (`skill` counts them from 0, its
 * passive last), or a hero's unique weapon's.
 */
export type Art = { hero: string; skill: number } | { uw: string };

/** The pictures of `hero`'s skills, by index (its passive last). */
export const skillArt =
  (hero: string) =>
  (skill: number): Art => ({ hero, skill });

/** Something a hero has on it, shown as a small square over its health: a passive it always has, or what a skill has given it for a while. */
export interface Buff {
  name: string;
  /** What it does, for whoever points at it. */
  about?: string;
  icon: string;
  art?: Art;
  /** Seconds it has left (a passive has none). */
  left?: number;
  /** How many of it are stacked up: shown in place of the seconds it has left. */
  count?: number;
  /** Something the boss has left on it, not something good: its square is edged in red. */
  harmful?: boolean;
}

/** A mark's colour, by what kind of thing it is. */
export type Tone = 'stun' | 'down' | 'slow' | 'curse' | 'venom' | 'burn' | 'rage';

/** What is the matter with the boss, said under its health, with how long it has left. */
export interface Mark {
  text: string;
  tone: Tone;
}

/** What a number coming off whoever a blow landed on (or a heal reached) says: a blow, a critical blow, a blow lessened by a block, what a shield took, health given back, or a blow dodged (no number). */
export type NumberKind = 'hit' | 'crit' | 'blocked' | 'shield' | 'heal' | 'dodged';

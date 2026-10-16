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

/** A share as a whole percentage (0.25: "25%"). */
export const pct = (share: number): string => `${Math.round(share * 100)}%`;
/** How many times as much, as a card says it ("twice", "three times"), and as King's Raid does ("doubled", "tripled"); and a place in a count ("3rd"). */
export const times = (n: number): string => (n === 2 ? 'twice' : n === 3 ? 'three times' : `${n} times`);
export const fold = (n: number): string => (n === 2 ? 'doubled' : n === 3 ? 'tripled' : `${n} times as much`);
export const nth = (n: number): string => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`;
/** So many seconds, as a card says it ("1 second", "3 seconds"). */
export const seconds = (n: number): string => `${n} second${n === 1 ? '' : 's'}`;
/** Every so many seconds ("every second", "every 3 seconds"). */
export const every = (n: number): string => (n === 1 ? 'every second' : `every ${n} seconds`);
/** A share as King's Raid says it: "half", or a percent. */
export const part = (share: number): string => (share === 0.5 ? 'half' : pct(share));
/** A number as King's Raid writes it, its thousands set apart (12000: "12,000"). */
export const num = (n: number): string => n.toLocaleString('en-US');
/** To a tenth of a percent (0.048: "4.8%"). */
export const fine = (share: number): string => `${Math.round(share * 1000) / 10}%`;

/** What a number coming off whoever a blow landed on (or a heal reached) says: a blow, a critical blow, a blow lessened by a block, what a shield took, health given back, a blow dodged, or one it is immune to (no number). */
export type NumberKind = 'hit' | 'crit' | 'blocked' | 'shield' | 'heal' | 'dodged' | 'immune';

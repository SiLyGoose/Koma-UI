/** A King's Raid clip as kr-anims.py's JSON has it (./kr-clips.ts). */
export interface ClipFile {
  name: string;
  duration: number;
  fps: number;
  /** What hangs straight from the creature, beside its skeleton, that it moves (what it holds: Point_Dummy; the marks of its hands). */
  top?: string[];
  /**
   * A bone's name, what of it (q: its rotation, p: its position, s: its scale), and its values frame by frame (or one
   * frame's: it stays so); or, with the frames' numbers after them, only at those frames (the rest lie on a straight line between).
   */
  tracks: [string, 'q' | 'p' | 's', number[], number[]?][];
}

/** A clip as the file the page is sent (before it is gzipped). Throws for one with a value finer than its kind's precision. */
export function encodeClip(clip: ClipFile): Uint8Array;

/** The clip in a file (unpacked from its gzip), as its JSON would have it. */
export function decodeClip(bytes: Uint8Array): ClipFile;

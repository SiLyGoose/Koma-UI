/** The brackets' box, not over anything: its side, and how far along each side its corners reach. */
export const IDLE_SIZE = 24;
export const IDLE_ARM = 7;
/** How far out from what's boxed the brackets sit, and the longest their corners reach there. */
export const LOCK_PAD = 6;
export const LOCK_ARM = 12;
/**
 * Parallax while boxed: the box leans after the mouse as it moves over what's boxed, by this share of how
 * far the mouse is from its middle, and never more than this many pixels. Only while the mouse moves: this
 * long (ms) after it stops, the box settles back square on it.
 */
export const LEAN = 0.12;
export const MAX_LEAN = 8;
export const LEAN_HOLD = 120;
/** How quickly the dot and the brackets catch up with the mouse (higher is quicker), not over anything and boxing something. */
export const FOLLOW = 10;
export const FOLLOW_BOXED = 12;
/** Degrees a second the brackets turn, not over anything. */
export const SPIN = 90;
/** Not boxed when it's most of the window (a game's whole board, say): the brackets stay turning over it. */
export const MAX_W = 0.8;
export const MAX_H = 0.6;

/** What's pressable in its own right: the mouse over something in one of these boxes it, not a bigger thing it's in. */
export const CONTROL = 'button, a[href], select, summary, label, input, [role="button"], [role="option"], [role="menuitem"], [role="tab"]';
/** Boxed things the hand stays over, in place of the dot, to see them by: the armory's and databank's items. */
export const KEEP_HAND = '.item';
/** Fields typed in: they keep the browser's I-beam, and the reticle hides over them. */
export const TEXT_FIELD =
  'textarea, [contenteditable]:not([contenteditable="false"]), input:is(:not([type]), [type="text"], [type="number"], [type="search"], [type="email"], [type="password"], [type="url"], [type="tel"])';

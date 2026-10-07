/** The hand (in public/), and where its fingertip is in it: that's where the mouse is. */
export const HAND = `${import.meta.env.BASE_URL}shared/cursor.png`;
/** The hand pressing, while a mouse button is held: the same size, drawn at the same place. */
export const HAND_PRESSED = `${import.meta.env.BASE_URL}shared/cursor-press.png`;
const HAND_TIP_X = 10;
const HAND_TIP_Y = 2;

/**
 * The reticle's elements: the brackets (four corners and two arrows, in their box, `frame`, and turned
 * within it by `turn`), the dot, and the hand, in one layer over the page.
 */
export function buildParts(reticle: boolean): { host: HTMLElement; frame: HTMLElement; turn: HTMLElement; dot: HTMLElement; hand: HTMLImageElement } {
  const host = document.createElement('div');
  host.className = 'reticle';
  host.setAttribute('aria-hidden', 'true');
  const frame = document.createElement('div');
  frame.className = 'reticle-frame';
  const turn = document.createElement('div');
  turn.className = 'reticle-turn';
  frame.append(turn);
  for (const part of ['corner tl', 'corner tr', 'corner bl', 'corner br', 'arrow left', 'arrow right']) {
    const i = document.createElement('i');
    i.className = part.replace(/(\w+) (\w+)/, 'reticle-$1 $2');
    turn.append(i);
  }
  const dot = document.createElement('div');
  dot.className = 'reticle-dot';
  const hand = document.createElement('img');
  hand.className = 'reticle-hand';
  hand.src = HAND;
  // Loaded now, so the first press shows it straight away.
  new Image().src = HAND_PRESSED;
  hand.alt = '';
  hand.style.margin = `${-HAND_TIP_Y}px 0 0 ${-HAND_TIP_X}px`;
  if (reticle) host.append(frame, dot);
  host.append(hand);
  return { host, frame, turn, dot, hand };
}

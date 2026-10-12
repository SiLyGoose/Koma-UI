/**
 * The hand pressing, while a mouse button is held (in public/, beside the hand, cursor.png): the same size,
 * its fingertip at the same place. cursor.css has them both as the browser's pointer.
 */
export const HAND_PRESSED = `${import.meta.env.BASE_URL}shared/cursor-press.png`;

/**
 * The reticle's elements: the brackets (four corners and two arrows, in their box, `frame`, and turned
 * within it by `turn`) and the dot, in one layer over the page.
 */
export function buildParts(): { host: HTMLElement; frame: HTMLElement; turn: HTMLElement; dot: HTMLElement } {
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
  host.append(frame, dot);
  return { host, frame, turn, dot };
}

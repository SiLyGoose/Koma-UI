import './landscape.css';

/*
 * Playing a game sideways on a phone, filling the screen like a game. Held upright, a cover asks them to turn it, with
 * a button that does it for them: where the browser allows it (Android), full screen locked to landscape; where it
 * doesn't (every browser on an iPhone: no full screen for the page, no orientation lock, and with the rotation lock on,
 * turning the phone does nothing), the page turns itself (.ls-sideways in ./landscape.css): laid out in landscape and
 * drawn a quarter turn round. Held sideways, the first tap goes full screen where it can.
 *
 * A page turned by hand is still upright to the browser, so a page laid out for landscape asks this module, not a
 * media query: <html> has .ls-landscape on a touch screen laid out in landscape, either way (onLandscape for a change),
 * and --ls-vw and --ls-vh are the page's width and height in place of 100vw and 100dvh. Anything placed by where it
 * shows on the screen measures through pageRect and pageSize.
 */

const root = document.documentElement;
const orientation = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
/** Whether the screen can be locked to landscape. iOS 16.4+ has screen.orientation.lock, but it always turns the request down: full screen tells them apart. */
export const canLockLandscape = document.fullscreenEnabled === true && typeof root.requestFullscreen === 'function' && typeof orientation?.lock === 'function';

const TOUCH = matchMedia('(pointer: coarse)');
const UPRIGHT = matchMedia('(orientation: portrait)');
/** Sent on window when the page goes into or out of landscape (or is turned by hand). */
const CHANGE = 'ls-change';

/** Full screen and locked to landscape. False when the browser turned it down. */
export async function playLandscape(): Promise<boolean> {
  try {
    if (!document.fullscreenElement) await root.requestFullscreen({ navigationUI: 'hide' });
    await orientation?.lock?.('landscape');
    return true;
  } catch {
    return false;
  }
}

/** Whether the page is turned by hand right now (held upright, drawn sideways). */
export const turnedByHand = (): boolean => root.classList.contains('ls-sideways') && UPRIGHT.matches;

/** Whether the page is laid out in landscape on a touch screen: the phone on its side, or the page turned by hand. */
export const inLandscape = (): boolean => TOUCH.matches && (!UPRIGHT.matches || turnedByHand());

/** Calls `then` whenever inLandscape (or the page's turn) may have changed. */
export function onLandscape(then: () => void): void {
  window.addEventListener(CHANGE, then);
}

/** Keeps .ls-landscape on <html> up to date and tells those listening. */
function update(): void {
  root.classList.toggle('ls-landscape', inLandscape());
  window.dispatchEvent(new Event(CHANGE));
}
TOUCH.addEventListener('change', update);
UPRIGHT.addEventListener('change', update);
update();

/** Turns the page itself sideways (see .ls-sideways). */
export function turnSideways(): void {
  root.classList.add('ls-sideways');
  update();
}

/** The page's size as it is laid out (turned by hand: the screen's height by its width). */
export const pageSize = (): { width: number; height: number } => (turnedByHand() ? { width: innerHeight, height: innerWidth } : { width: innerWidth, height: innerHeight });

/**
 * Where an element is on the page as it is laid out, as getBoundingClientRect has it on a page that isn't turned. Turned
 * by hand, the page is drawn a quarter turn clockwise (translateX(100vw) rotate(90deg)): a point (x, y) of the page shows
 * at (innerWidth − y, x) on the screen.
 */
export function pageRect(element: Element): DOMRect {
  const at = element.getBoundingClientRect();
  if (!turnedByHand()) return at;
  return new DOMRect(at.top, innerWidth - at.right, at.height, at.width);
}

export interface LandscapeCover {
  /** The cover's title, like "Turn your phone sideways". */
  title: string;
  /** Under it: what is played sideways. */
  text: string;
  /** The way out, for anyone who'd rather not play now (its words: "← Back to the games" when not given). */
  back?: { label?: string; go: () => void };
}

/**
 * A game played sideways: on a touch screen held upright, a cover over everything (in `into`) asking them to turn it,
 * with the button that does it for them, and (where it can) full screen on the first tap held sideways.
 */
export function landscapeCover(into: HTMLElement, { title, text, back }: LandscapeCover): HTMLElement {
  const cover = document.createElement('div');
  cover.className = 'ls-cover';
  cover.setAttribute('role', 'alert');
  const card = document.createElement('div');
  card.className = 'ls-card';
  const phone = document.createElement('div');
  phone.className = 'ls-phone';
  phone.setAttribute('aria-hidden', 'true');
  const heading = document.createElement('p');
  heading.className = 'ls-title';
  heading.textContent = title;
  const words = document.createElement('p');
  words.className = 'ls-text';
  words.textContent = text;
  card.append(phone, heading, words);

  if (TOUCH.matches) {
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'action main ls-go';
    go.textContent = canLockLandscape ? 'Play in landscape' : 'Play sideways';
    go.addEventListener('click', () => {
      void (async () => {
        if (!canLockLandscape || !(await playLandscape())) turnSideways();
      })();
    });
    card.append(go);
    if (!canLockLandscape) {
      const hint = document.createElement('p');
      hint.className = 'ls-hint';
      hint.textContent = "Screen won't turn? Your phone's rotation lock may be on (on an iPhone, it's in Control Center).";
      card.append(hint);
    }
  }
  if (back) {
    const away = document.createElement('button');
    away.type = 'button';
    away.className = 'action secondary ls-back';
    away.textContent = back.label ?? '← Back to the games';
    away.addEventListener('click', back.go);
    card.append(away);
  }
  cover.append(card);
  into.append(cover);

  if (TOUCH.matches && canLockLandscape) {
    document.addEventListener(
      'pointerdown',
      () => {
        if (!UPRIGHT.matches && !document.fullscreenElement) void playLandscape();
      },
      { once: true },
    );
  }
  return cover;
}

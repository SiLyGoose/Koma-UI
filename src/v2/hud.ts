import { canLockLandscape, playLandscape } from '../shared/ui/landscape/landscape';
import { currentMe, currentServer, hasSession, logIn } from '../site/session';

/*
 * What sits over the town's corners (no bar across it): the top left is the member's profile (./profile.ts, put in
 * .v2-hud-left), their zeiucoins in the server picked at the top right, with full screen (where it can be) and, logged out, Login. A note across
 * the bottom says what a place needs (logging in) when the runner gets there.
 */

/** Where v2 is to come back to after logging in (the front page reads it once Discord sends the member back). */
export const AFTER_LOGIN_KEY = 'koma.afterLogin';

export interface Hud {
  element: HTMLElement;
  /** Shows who's logged in and their balance as they are now. */
  render(): void;
  /** A note across the bottom (null: none), with a Login button when `login`. */
  note(text: string | null, login?: boolean): void;
  /** Logs in with Discord, coming back to this address. */
  logIn(): void;
}

const points = (n: number): string => n.toLocaleString('en-US');

export function makeHud(into: HTMLElement): Hud {
  const element = document.createElement('div');
  element.className = 'v2-hud';
  element.innerHTML = `
    <div class="v2-hud-left"></div>
    <div class="v2-hud-right">
      <span class="v2-balance" hidden><img class="v2-coin" src="${import.meta.env.BASE_URL}shared/zeiucoin.png" alt="zeiucoins"><b></b></span>
      <button type="button" class="action main v2-login" hidden>Login</button>
      <button type="button" class="v2-round v2-full" aria-label="Full screen" hidden>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5v2H6v3zm10-5h6v5h-2V6h-4zM4 15h2v3h3v2H4zm14 3v-3h2v5h-6v-2z"/></svg>
      </button>
    </div>
    <div class="v2-note" hidden><span class="v2-note-text"></span><button type="button" class="action main v2-note-login" hidden>Login</button></div>`;
  into.append(element);

  const $ = <T extends HTMLElement>(selector: string): T => element.querySelector(selector) as T;
  const balance = $('.v2-balance');
  const login = $<HTMLButtonElement>('.v2-login');
  const full = $<HTMLButtonElement>('.v2-full');
  const noteBox = $('.v2-note');
  const noteText = $('.v2-note-text');
  const noteLogin = $<HTMLButtonElement>('.v2-note-login');

  function goLogIn(): void {
    try {
      sessionStorage.setItem(AFTER_LOGIN_KEY, location.pathname + location.search);
    } catch {
      // No storage: back to the front page, as the old site does.
    }
    logIn();
  }
  login.addEventListener('click', goLogIn);
  noteLogin.addEventListener('click', goLogIn);

  // Full screen (hiding the browser's bars): where the browser has it and it isn't already.
  const canFull = document.fullscreenEnabled === true;
  const showFull = (): void => void (full.hidden = !canFull || !!document.fullscreenElement);
  full.addEventListener('click', () => {
    void (canLockLandscape ? playLandscape() : document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => undefined));
  });
  document.addEventListener('fullscreenchange', showFull);
  showFull();

  function render(): void {
    const me = currentMe();
    login.hidden = !!me || hasSession();
    const here = me?.servers.find((s) => s.id === currentServer());
    balance.hidden = !here;
    ($('.v2-balance b') as HTMLElement).textContent = here ? points(here.balance) : '';
  }

  let noteTimer = 0;
  function note(text: string | null, withLogin = false): void {
    clearTimeout(noteTimer);
    noteBox.hidden = text === null;
    noteText.textContent = text ?? '';
    noteLogin.hidden = !withLogin;
    if (text !== null && !withLogin) noteTimer = window.setTimeout(() => note(null), 3500);
  }

  render();
  return { element, render, note, logIn: goLogIn };
}

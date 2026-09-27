import { loadUser, profileMenu, setSession } from './account';
import './frame.css';

/*
 * The frame every game sits in: a blue border round the window and a title bar across the top. Its
 * markup is in each game's page, so it shows before any script runs:
 *
 *   <main class="frame …">
 *     <header class="top">
 *       <a class="back" href="/" aria-label="Back to the games">←</a>
 *       <h1>💎 Mines</h1>
 *       <button type="button" id="mute" class="frame-mute" aria-label="Turn sound off" aria-pressed="false">🔊</button>
 *       <span id="conn" class="conn">Connecting…</span>
 *     </header>
 *     …the game…
 *
 * This works its sound button and connection pill, and puts the member logged in on this browser
 * (if any) at the far right.
 */

/** Shows how the connection to the bot is doing, in the title bar. */
export function setConn(text: string, kind: '' | 'ok' | 'bad'): void {
  const conn = document.getElementById('conn') as HTMLElement;
  conn.textContent = text;
  conn.className = `conn ${kind}`;
}

/**
 * The sound button: shows whether sound is off and remembers it (in storage under `key`, so each
 * game has its own), telling `onChange` straight away and on every click.
 */
export function soundButton(key: string, onChange: (muted: boolean) => void): void {
  const button = document.getElementById('mute') as HTMLButtonElement;
  let muted = false;
  try {
    muted = localStorage.getItem(key) === '1';
  } catch {
    // No storage (a private window): sound starts on.
  }
  const render = (): void => {
    button.textContent = muted ? '🔇' : '🔊';
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
  };
  button.addEventListener('click', () => {
    muted = !muted;
    try {
      localStorage.setItem(key, muted ? '1' : '0');
    } catch {
      // Not remembered, but still off for now.
    }
    render();
    onChange(muted);
  });
  render();
  onChange(muted);
}

/** A place in the title bar, before the sound button, for something more (the online button, live.ts). */
export function barSlot(): HTMLElement {
  const slot = document.createElement('span');
  slot.className = 'frame-slot';
  const mute = document.getElementById('mute');
  if (mute) mute.before(slot);
  else document.querySelector('.frame > .top')?.append(slot);
  return slot;
}

/** The member logged in on this browser, at the far right of the title bar (nothing if no one is). */
async function showProfile(): Promise<void> {
  const bar = document.querySelector('.frame > .top');
  if (!bar) return;
  const user = await loadUser();
  if (!user) return;
  const profile = profileMenu(user, [
    { label: 'Games', icon: 'games', href: '/' },
    {
      label: 'Log out',
      icon: 'logout',
      onSelect: () => {
        setSession(null);
        profile.remove();
      },
    },
  ]);
  profile.classList.add('frame-profile');
  bar.append(profile);
}

void showProfile();

import { loadUser, profileMenu, setSession } from './account';
import { installCursor } from './cursor';
import { installClickSounds } from './ui-sfx';
import './frame.css';
import { catchBack, holdReveal } from './transition';

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

/** A game stays under the loading screen until it has connected, or found it can't. */
const revealed = holdReveal();

// The hand in place of the mouse pointer: no reticle trailing it over the game.
installCursor({ reticle: false });
// A click on anything pressable has its sound (./ui-sfx.ts).
installClickSounds();

// The browser's back button wipes the game away right to left, as its ← does.
catchBack('/');

/** Shows how the connection to the bot is doing, in the title bar. */
export function setConn(text: string, kind: '' | 'ok' | 'bad'): void {
  const conn = document.getElementById('conn') as HTMLElement;
  conn.textContent = text;
  conn.className = `conn ${kind}`;
  // Connected: the game's first state follows straight after, so give it a moment to draw.
  if (kind === 'ok') setTimeout(revealed, 150);
  else if (kind === 'bad') revealed();
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
  // Gear, Forge and Databank on wider screens only (frame.css): a phone's drop-down is full already.
  const profile = profileMenu(user, [
    { label: 'Games', icon: 'games', href: '/' },
    { label: 'Gear', icon: 'gear', href: '/gear/', className: 'frame-wide-only' },
    { label: 'Forge', icon: 'forge', href: '/forge/', className: 'frame-wide-only' },
    { label: 'Databank', icon: 'databank', href: '/databank/', className: 'frame-wide-only' },
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
  onPhonesInProfile(profile);
}

/**
 * On a phone the bar is short of room: the connection and the online button move to the top of
 * the profile's drop-down, and back to the bar on a wider screen.
 */
function onPhonesInProfile(profile: HTMLElement): void {
  const list = profile.querySelector('.account-menu');
  const conn = document.getElementById('conn');
  if (!list || !conn) return;
  const extra = document.createElement('li');
  extra.className = 'frame-extra';
  list.prepend(extra);
  const phone = matchMedia('(max-width: 640px)');
  const place = (): void => {
    // The online button (live.ts, in barSlot) may not be there yet, or at all.
    const live = document.querySelector('.frame-slot');
    extra.hidden = !phone.matches;
    profile.classList.toggle('frame-profile-extra', phone.matches);
    if (phone.matches) {
      extra.append(conn);
      if (live) extra.append(live);
    } else {
      profile.before(conn);
      if (live) document.getElementById('mute')?.before(live);
    }
  };
  place();
  phone.addEventListener('change', place);
}

void showProfile();

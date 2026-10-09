import { loadUser, profileMenu, setSession } from '../account/account';
import { installCursor } from '../../cursor';
import { installClickSounds } from '../../audio';
import './frame.css';
import { catchBack, holdReveal } from '../../transition';

/*
 * The frame every game sits in: a blue border round the window and a title bar across the top. A
 * game's page puts it on its <main class="frame …" data-title="💎 Mines">, and this puts the bar in
 * at the top of it (frame.css keeps the bar's room until then, so the game doesn't move down when it
 * comes): the way back to the games, the game's name, the sound button and the connection pill.
 *
 * This works its sound button and connection pill, and puts the member logged in on this browser
 * (if any) at the far right.
 */

/** The title bar, put in before anything else here runs. */
const bar = document.createElement('header');
bar.className = 'top';
bar.innerHTML = `
  <a class="back" href="/" aria-label="Back to the games">←</a>
  <h1></h1>
  <button type="button" id="mute" class="frame-mute" aria-label="Turn sound off" aria-pressed="false">🔊</button>
  <span id="conn" class="conn">Connecting…</span>`;
const frame = document.querySelector<HTMLElement>('.frame');
const title = bar.querySelector('h1') as HTMLElement;
title.textContent = frame?.dataset.title ?? document.title;
frame?.prepend(bar);

/**
 * A span after the game's name in the title bar, with `className` (the table's number, the boss's
 * name): put in the first time it's asked for, the same one after that.
 */
export function titleExtra(className: string): HTMLElement {
  const found = title.querySelector<HTMLElement>(`.${className}`);
  if (found) return found;
  const extra = document.createElement('span');
  extra.className = className;
  title.append(' ', extra);
  return extra;
}

/** A game stays under the loading screen until it has connected, or found it can't. */
const revealed = holdReveal();

// The hand in place of the mouse pointer: no reticle trailing it over the game.
installCursor({ reticle: false });
// A click on anything pressable has its sound (../../audio/ui-sfx.ts).
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

/** A place in the title bar, before the sound button, for something more (the online button, ../live/live.ts). */
export function barSlot(): HTMLElement {
  const slot = document.createElement('span');
  slot.className = 'frame-slot';
  const mute = document.getElementById('mute');
  if (mute) mute.before(slot);
  else bar.append(slot);
  return slot;
}

/** The member logged in on this browser, at the far right of the title bar (nothing if no one is). */
async function showProfile(): Promise<void> {
  const user = await loadUser();
  if (!user) return;
  const profile = profileMenu(user, [
    { label: 'Games', icon: 'games', href: '/' },
    { label: 'Gear', icon: 'gear', href: '/gear/' },
    { label: 'Forge', icon: 'forge', href: '/forge/' },
    { label: 'Shop', icon: 'shop', href: '/shop/' },
    { label: 'Databank', icon: 'databank', href: '/databank/' },
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
    // The online button (../live/live.ts, in barSlot) may not be there yet, or at all.
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

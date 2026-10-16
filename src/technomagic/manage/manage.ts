import '../../shared/style.css';
import '../../shared/ui/button/button.css';
import '../../shared/items/items.css';
import '../../gear/gear.css';
import '../../heroes/heroes.css';
import '../../raid/gear/gear.css';
import markup from '../../heroes/heroes.html?raw';
import { apiFromSocket, backdrop } from '../../shared/ui';
import { installCursor } from '../../shared/cursor';
import { installClickSounds, setMuted } from '../../shared/audio';
import { mountHeroes } from '../../heroes/page';
import type { ApiResult } from '../../site/session';

/*
 * The heroes page in the TechnoMagic Raid's Manage popup (an iframe: its own screen, so the page's layout, which
 * goes by the screen's width, is laid out as on a computer and scaled down to fit: ./popup.ts). The player gears
 * their heroes, picks perks and transcends them without leaving the room; the bot takes their gear as it is when
 * the fight begins. It asks the bot with the raid's link, which answers for the link's server only (so no server
 * picker), and buying a hero stays the site's (no way to the shop from in here).
 *
 * Its link's #hash: the raid's token (t) and socket (s). Escape, with nothing open in the page to close, asks
 * the raid page to close the popup.
 */

const params = new URLSearchParams(location.hash.slice(1));
const token = params.get('t') ?? '';
const socket = params.get('s') ?? '';
const base = socket ? apiFromSocket(socket) : '';

/** The link's server (in its token, signed by the bot: only read here, the bot goes by its own copy). */
function linkServer(): string | null {
  try {
    const body = token.split('.')[0] ?? '';
    const data = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/'))) as { g?: unknown };
    return typeof data.g === 'string' ? data.g : null;
  } catch {
    return null;
  }
}
const server = linkServer();

async function api<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${base}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Game ${token}`, ...init.headers } });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return res.ok ? { ok: true, data: body as T } : { ok: false, status: res.status, error: body.error ?? 'failed' };
  } catch {
    return { ok: false, status: 0, error: 'offline' };
  }
}

document.body.prepend(backdrop());
// Sound as the raid has it: its sound button's setting, kept in storage, followed as it changes.
const MUTED = 'technomagic-muted';
const readMuted = (): boolean => {
  try {
    return localStorage.getItem(MUTED) === '1';
  } catch {
    return false;
  }
};
setMuted(readMuted());
addEventListener('storage', (event) => {
  if (event.key === MUTED) setMuted(readMuted());
});
installCursor({ reticle: false });
installClickSounds();

// Before the page's own Escape (which closes the copy shown): with nothing open, the popup goes.
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const open = document.querySelector('#detail:not([hidden]), dialog[open]');
  if (!open) parent.postMessage({ t: 'close-heroes' }, location.origin);
});

const view = document.getElementById('view') as HTMLElement;
view.innerHTML = markup;
const root = view.firstElementChild as HTMLElement;
// Buying a hero is the site's: no way to the shop from in here.
root.querySelector('#hero-buy')?.remove();

const status = root.querySelector('#status') as HTMLElement;
mountHeroes(root, {
  api,
  ready: !!token && !!base && server !== null,
  me: () => null,
  loadMe: async () => ({ ok: true, data: null }),
  server: () => server,
  setServer: () => undefined,
  logOut: () => {
    status.hidden = false;
    status.classList.add('bad');
    status.textContent = 'This raid link has run out. Open the TechnoMagic Raid again from the games page.';
  },
});

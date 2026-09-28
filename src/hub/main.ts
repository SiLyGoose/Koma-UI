import '../style.css';
import { API, getSession, profileMenu, setSession, store } from '../account';
import './hub.css';
import { startLive } from '../live';

/*
 * The front page: log in with Discord, pick a server, pick a game. The bot does the logging in
 * (its /api, at VITE_API_URL): this page sends the browser to the bot, which sends it to Discord,
 * which sends it back here with a code; the bot trades the code for a session, kept in this
 * browser. Picking a game asks the bot for a link to it, like the ones handed out in Discord.
 */

type Game = 'mines' | 'pinecraft' | 'baccarat' | 'roulette';

interface Me {
  user: { id: string; name: string; avatar: string };
  servers: { id: string; name: string; icon: string | null; balance: number }[];
  games: Game[];
}

const SERVER_KEY = 'koma.server';
const STATE_KEY = 'koma.loginState';
/** A game to open once logged in: from a link like /?play=mines&guild=123 (the bot's buttons in Discord). */
const PLAY_KEY = 'koma.playNext';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const ui = {
  me: $('me'),
  nav: $('site-nav'),
  headerLogin: $<HTMLButtonElement>('header-login'),
  login: $('login'),
  loginButton: $<HTMLButtonElement>('login-button'),
  status: $('status'),
  play: $('play'),
  servers: $('servers'),
  noServers: $('no-servers'),
};

let session = getSession();
let me: Me | null = null;
let server = store.get(localStorage, SERVER_KEY);

function status(text: string | null, bad = false): void {
  ui.status.hidden = text === null;
  ui.status.textContent = text ?? '';
  ui.status.classList.toggle('bad', bad);
}

async function api<T>(path: string, init: RequestInit = {}): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}), ...init.headers },
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return res.ok ? { ok: true, data: body as T } : { ok: false, status: res.status, error: body.error ?? 'failed' };
  } catch {
    return { ok: false, status: 0, error: 'offline' };
  }
}

/** The profile button in the header (account.ts), once logged in. */
let profile: HTMLElement | null = null;

function showLogin(): void {
  ui.login.hidden = false;
  ui.play.hidden = true;
  ui.me.hidden = true;
  ui.nav.hidden = true;
  ui.headerLogin.hidden = false;
  profile?.remove();
  profile = null;
}

const points = (n: number): string => n.toLocaleString('en-US');

function render(): void {
  if (!me) return showLogin();
  ui.login.hidden = true;
  ui.me.hidden = false;
  ui.nav.hidden = false;
  ui.headerLogin.hidden = true;
  profile?.remove();
  profile = profileMenu(me.user, [
    // On smaller screens the header's links are here instead (My Servers is the other one).
    { label: 'Games', icon: 'games', href: '#games', className: 'site-nav-item' },
    { label: 'My Servers', icon: 'servers', href: '#play' },
    { label: 'Logout', icon: 'logout', onSelect: logOut },
  ]);
  ui.me.append(profile);
  ui.play.hidden = false;

  if (!me.servers.some((s) => s.id === server)) server = me.servers[0]?.id ?? null;
  ui.servers.textContent = '';
  ui.noServers.hidden = me.servers.length > 0;
  for (const s of me.servers) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `server${s.id === server ? ' picked' : ''}`;
    const icon = document.createElement(s.icon ? 'img' : 'span');
    icon.className = 'server-icon';
    if (s.icon) (icon as HTMLImageElement).src = s.icon;
    else icon.textContent = s.name.slice(0, 1).toUpperCase();
    const name = document.createElement('span');
    name.className = 'server-name';
    name.textContent = s.name;
    const balance = document.createElement('span');
    balance.className = 'server-balance';
    balance.textContent = `${points(s.balance)} pts`;
    button.append(icon, name, balance);
    button.addEventListener('click', () => {
      server = s.id;
      store.set(localStorage, SERVER_KEY, s.id);
      render();
    });
    ui.servers.append(button);
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-play]')) {
    button.disabled = server === null || !me.games.includes(button.dataset.play as Game);
  }
}

function logOut(): void {
  session = null;
  me = null;
  setSession(null);
  status(null);
  showLogin();
}

/** Back from Discord with a code: trade it for a session. */
async function finishLogin(code: string, state: string): Promise<void> {
  history.replaceState(null, '', location.pathname);
  const wanted = store.get(sessionStorage, STATE_KEY);
  store.set(sessionStorage, STATE_KEY, null);
  if (!wanted || wanted !== state) {
    status('That login did not come from this page. Try again.', true);
    return showLogin();
  }
  status('Logging in…');
  const res = await api<{ session: string; me: Me }>('/api/login', { method: 'POST', body: JSON.stringify({ code }) });
  if (!res.ok) {
    status(res.error === 'discord_failed' ? 'Discord did not let that login through. Try again.' : 'Could not log in. Try again in a moment.', true);
    return showLogin();
  }
  session = res.data.session;
  setSession(session);
  me = res.data.me;
  status(null);
  render();
  playPending();
}

async function loadMe(): Promise<void> {
  status('Loading…');
  const res = await api<Me>('/api/me');
  if (!res.ok) {
    if (res.status === 401) {
      logOut();
      return;
    }
    status(res.status === 0 ? 'Koma is not answering right now. Try again in a moment.' : 'Could not load your servers.', true);
    return showLogin();
  }
  me = res.data;
  status(null);
  render();
  playPending();
}

/** Opens the game a link asked for (kept through the login), in the server it came from if the member is in it. */
function playPending(): void {
  const wanted = store.get(sessionStorage, PLAY_KEY);
  store.set(sessionStorage, PLAY_KEY, null);
  if (!wanted || !me) return;
  const { game, guild } = JSON.parse(wanted) as { game: string; guild: string | null };
  if (guild && me.servers.some((s) => s.id === guild)) {
    server = guild;
    store.set(localStorage, SERVER_KEY, guild);
    render();
  }
  document.querySelector<HTMLButtonElement>(`[data-play="${CSS.escape(game)}"]`)?.click();
}

function logIn(): void {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const state = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  store.set(sessionStorage, STATE_KEY, state);
  location.href = `${API}/api/login?state=${state}`;
}
ui.loginButton.addEventListener('click', logIn);
ui.headerLogin.addEventListener('click', logIn);

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-play]')) {
  button.addEventListener('click', async () => {
    if (!server) return;
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Opening…';
    const res = await api<{ url: string }>('/api/play', { method: 'POST', body: JSON.stringify({ guild: server, game: button.dataset.play }) });
    if (res.ok) {
      location.href = res.data.url;
      return;
    }
    button.disabled = false;
    button.textContent = label;
    if (res.status === 401) return logOut();
    status(res.error === 'not_member' ? "You don't seem to be in that server any more. Log out and in again to refresh it." : 'Could not open the game. Try again.', true);
  });
}

// ---------------------------------------------------------------------------
// Start

if (!API) {
  status('This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
} else {
  const query = new URLSearchParams(location.search);
  // A link to a game (from Discord): remember it through the login, and tidy the address.
  const play = query.get('play');
  if (play === 'mines' || play === 'pinecraft' || play === 'baccarat' || play === 'roulette') {
    store.set(sessionStorage, PLAY_KEY, JSON.stringify({ game: play, guild: query.get('guild') }));
    history.replaceState(null, '', location.pathname);
  }
  const code = query.get('code');
  const state = query.get('state');
  if (query.get('error')) {
    history.replaceState(null, '', location.pathname);
    status('The login was cancelled.');
    showLogin();
  } else if (code && state) void finishLogin(code, state);
  else if (session) void loadMe();
  else showLogin();
  // Who's on the site in the server picked, by the profile (once logged in). Asking counts as being here.
  startLive({
    mount: ui.me,
    api: API,
    auth: () => (session && server ? `Bearer ${session}` : null),
    query: () => (server ? `?guild=${encodeURIComponent(server)}` : ''),
  });
}

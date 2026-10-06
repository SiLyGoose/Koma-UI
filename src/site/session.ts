import { API, getSession, profileMenu, setSession, store } from '../shared/account';
import { reconnecting } from '../shared/reconnect';
import { startLive } from '../shared/live';
import { go } from './nav';

/*
 * What every site page shares, kept while the member moves between them: who's logged in (the session
 * the bot gave this browser, and their /api/me), the server they picked, and the header's right side
 * (their profile button and who's online, or a Login button). Loaded once; the front page asks for a
 * fresh /api/me (the points shown there change as they play).
 */

export type Game = 'mines' | 'pinecraft' | 'baccarat' | 'roulette' | 'raid';

export interface Me {
  user: { id: string; name: string; avatar: string };
  servers: { id: string; name: string; icon: string | null; balance: number }[];
  games: Game[];
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

const SERVER_KEY = 'koma.server';
const STATE_KEY = 'koma.loginState';

let session = getSession();
let me: Me | null = null;
let loading: Promise<ApiResult<Me>> | null = null;
let server = store.get(localStorage, SERVER_KEY);

export const hasSession = (): boolean => session !== null;
export const currentMe = (): Me | null => me;

/** How long to wait between tries while the bot isn't answering. */
const RETRY_MS = 2500;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Asks the bot, as the member logged in (if any). Errors are { status, error }. While the bot doesn't
 * answer, "Reconnecting…" covers the site (../shared/reconnect.ts): a GET is tried again until it
 * answers; a change (a POST) is never sent twice, since it may have gone through before the answer was
 * lost, so it waits for the bot to answer anything again, then comes back as { status: 0 } (no
 * answer) for the page to load what's there afresh.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const first = await ask<T>(path, init);
  if (first.ok || first.status !== 0) return first;
  const done = reconnecting();
  try {
    if ((init.method ?? 'GET') === 'GET') {
      for (;;) {
        await sleep(RETRY_MS);
        const res = await ask<T>(path, init);
        if (res.ok || res.status !== 0) return res;
      }
    }
    for (;;) {
      await sleep(RETRY_MS);
      const res = await ask('/api/me');
      if (res.ok || res.status !== 0) return first;
    }
  } finally {
    done();
  }
}

/** One try at asking the bot (status 0: no answer). */
async function ask<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
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

/**
 * Who's logged in (/api/me), asked once and kept; `fresh` asks again. A session the bot no longer
 * takes (401) is dropped. Needs a session.
 */
export function loadMe(fresh = false): Promise<ApiResult<Me>> {
  if (loading && !fresh) return loading;
  loading = api<Me>('/api/me').then((res) => {
    if (res.ok) {
      me = res.data;
      pickServer();
    } else if (res.status === 401) forget();
    else loading = null; // Not kept: the next page asks again.
    renderHeader();
    return res;
  });
  return loading;
}

/** Logged in just now (the front page, back from Discord): their session and who they are. */
export function loggedIn(newSession: string, who: Me): void {
  session = newSession;
  setSession(newSession);
  me = who;
  loading = Promise.resolve({ ok: true, data: who });
  pickServer();
  renderHeader();
}

/** Drops the session here (not a logout at the bot: the session just expires there). */
function forget(): void {
  session = null;
  me = null;
  loading = null;
  setSession(null);
}

/** Logs out, and goes to the front page (which then offers to log in). */
export function logOut(): void {
  forget();
  renderHeader();
  go('/', { reload: true });
}

/** Sends the browser to the bot to log in with Discord; it comes back to the front page with a code. */
export function logIn(): void {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const state = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  store.set(sessionStorage, STATE_KEY, state);
  location.href = `${API}/api/login?state=${state}`;
}

/** The login state the front page sent to Discord (once: it's forgotten as it's read). */
export function takeLoginState(): string | null {
  const state = store.get(sessionStorage, STATE_KEY);
  store.set(sessionStorage, STATE_KEY, null);
  return state;
}

// ---------------------------------------------------------------------------
// The server picked

/** The server picked (kept in this browser), or null (none, or not logged in yet). */
export const currentServer = (): string | null => server;

export function setServer(id: string): void {
  server = id;
  store.set(localStorage, SERVER_KEY, id);
}

/** Keeps the server picked to one they're in (the first, when it isn't). */
function pickServer(): void {
  if (me && !me.servers.some((s) => s.id === server)) server = me.servers[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// The header

const ui = {
  me: document.getElementById('me') as HTMLElement,
  login: document.getElementById('header-login') as HTMLButtonElement,
};
let profile: HTMLElement | null = null;

/** The header's right side: the profile button (with who's online), or Login. */
function renderHeader(): void {
  ui.me.hidden = !me;
  ui.login.hidden = !!me || !!session;
  profile?.remove();
  profile = null;
  if (!me) return;
  profile = profileMenu(me.user, [
    // On smaller screens the header's links are here instead.
    { label: 'Games', icon: 'games', href: '/#games', className: 'site-nav-item' },
    { label: 'Gear', icon: 'gear', href: '/gear/', className: 'site-nav-item' },
    { label: 'Forge', icon: 'forge', href: '/forge/', className: 'site-nav-item' },
    { label: 'Wish', icon: 'banner', href: '/banner/', className: 'site-nav-item' },
    { label: 'Databank', icon: 'databank', href: '/databank/', className: 'site-nav-item' },
    { label: 'My Servers', icon: 'servers', href: '/#play' },
    { label: 'Logout', icon: 'logout', onSelect: logOut },
  ]);
  ui.me.append(profile);
}

ui.login.addEventListener('click', logIn);
renderHeader();

// Who's on the site in the server picked, by the profile (once logged in). Asking counts as being here.
if (API) {
  startLive({
    mount: ui.me,
    api: API,
    auth: () => (session && server ? `Bearer ${session}` : null),
    query: () => (server ? `?guild=${encodeURIComponent(server)}` : ''),
  });
}

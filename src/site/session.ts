import { mailButton } from '../shared/ui/mail/mail';
import { API, getSession, profileMenu, reconnecting, setSession, siteHeader, startLive, store } from '../shared/ui';
import { go } from './nav';
import type { Me } from '../protocol/site';

/** Who is logged in, and the games (../protocol/site.ts). */
export type { Game, Me } from '../protocol/site';


/*
 * What every site page shares, kept while the member moves between them: who's logged in (the session
 * the bot gave this browser, and their /api/me), the server they picked, and the header's right side
 * (their profile button and who's online, or a Login button). Loaded once; the front page asks for a
 * fresh /api/me (the points shown there change as they play).
 */

/** An error's `detail` is the rest of what the bot said with it (the admin page's invalid_setting has its `problems`). */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string; detail?: Record<string, unknown> };

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

/** How long an answer asked for ahead (prefetch) is good for: a page uses it as it's shown, a second or so later. */
const AHEAD_MS = 10_000;
/** GETs asked for ahead, by path: the first api() call for one takes its answer. */
const ahead = new Map<string, { at: number; answer: Promise<ApiResult<unknown>> }>();

/**
 * Asks the bot for `path` (a GET) now, for a page about to be shown: going to a page, its data is asked for as the
 * transition covers the old one (../site/main.ts), not only once the new one is set up under it, a second later. The
 * page's own api() call for it then takes this answer.
 */
export function prefetch(path: string): void {
  const known = ahead.get(path);
  if (known && performance.now() - known.at < AHEAD_MS) return;
  ahead.set(path, { at: performance.now(), answer: api(path) });
}

/** A page's prefetch: each of `paths` in the server picked (`guild`, ready to go in an address), for someone logged in. */
export function prefetchFor(...paths: ((guild: string) => string)[]): void {
  if (!API || !session || !server) return;
  for (const path of paths) prefetch(path(encodeURIComponent(server)));
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Asks the bot, as the member logged in (if any). Errors are { status, error }. While the bot doesn't
 * answer, "Reconnecting…" covers the site (../shared/ui/reconnect/reconnect.ts): a GET is tried again until it
 * answers; a change (a POST) is never sent twice, since it may have gone through before the answer was
 * lost, so it waits for the bot to answer anything again, then comes back as { status: 0 } (no
 * answer) for the page to load what's there afresh.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  // Asked for ahead (prefetch), a moment ago: that answer.
  const early = (init.method ?? 'GET') === 'GET' && Object.keys(init).every((key) => key === 'method') ? ahead.get(path) : undefined;
  if (early) {
    ahead.delete(path);
    if (performance.now() - early.at < AHEAD_MS) return early.answer as Promise<ApiResult<T>>;
  }
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
    return res.ok ? { ok: true, data: body as T } : { ok: false, status: res.status, error: body.error ?? 'failed', detail: body };
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

const ui = siteHeader();
let profile: HTMLElement | null = null;
/** The mail button beside the profile (../shared/ui/mail/mail.ts), once logged in. */
let mail: ReturnType<typeof mailButton> | null = null;

/** The header's right side: the profile button (with who's online), or Login. */
function renderHeader(): void {
  ui.me.hidden = !me;
  ui.login.hidden = !!me || !!session;
  profile?.remove();
  profile = null;
  if (!me) {
    mail?.remove();
    mail = null;
    return;
  }
  profile = profileMenu(me.user, [
    // On smaller screens the header's links are here instead.
    { label: 'Games', icon: 'games', href: '/#games', className: 'site-nav-item' },
    { label: 'Gear', icon: 'gear', href: '/gear/', className: 'site-nav-item' },
    { label: 'Heroes', icon: 'heroes', href: '/heroes/', className: 'site-nav-item' },
    { label: 'Forge', icon: 'forge', href: '/forge/', className: 'site-nav-item' },
    { label: 'Shop', icon: 'shop', href: '/shop/', className: 'site-nav-item' },
    { label: 'Databank', icon: 'databank', href: '/databank/', className: 'site-nav-item' },
    { label: 'My Servers', icon: 'servers', href: '/#play' },
    // The bot's settings (../admin/), for the bot admin only.
    ...(me.admin ? [{ label: 'Admin', icon: 'admin', href: '/admin/' } as const] : []),
    { label: 'Logout', icon: 'logout', onSelect: logOut },
  ]);
  ui.me.append(profile);
  // The mailbox: its button before the profile, its unread count on it.
  mail?.remove();
  mail = mailButton(ui.me, { api, server: () => server, changed: () => void loadMe(true) });
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

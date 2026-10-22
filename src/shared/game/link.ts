import { store } from '../ui/account/account';
import { apiFromSocket } from '../ui/live/live';
import type { LinkRefresh } from '../../protocol/site';

/*
 * A game's link, from Discord or the front page: after the #, the player's token (t) and the bot's
 * WebSocket address (s). A link to watch someone play has w= in place of t= (watch-only: nothing on
 * the page can be pressed). The TechnoMagic Raid's has m=single when it was opened single player (a room
 * of the player's own) from the front page.
 *
 * Its token lasts a couple of hours (the bot's MINE_WEB.linkTtlMs), so an open page keeps it good (freshLink): as it
 * opens it trades it for a refresh token (POST /api/link/refresh), then that for a new token every so often and before
 * it connects again, so a page left open for long (its player away, the computer asleep) carries on. The newest token
 * goes in the address (a reload opens with it), and the refresh token in the tab's sessionStorage with the token it
 * goes with (a reload of this link only).
 */

const params = new URLSearchParams(location.hash.slice(1));
const watchToken = params.get('w');

export const watching = watchToken !== null;
/** The token the page opened with (null: none): whether it has a link at all. The one to use is linkToken(). */
export const token = params.get('t') ?? watchToken;
export const server = params.get('s');
export const single = params.get('m') === 'single';

/** Where the refresh token is kept (sessionStorage), with the token it goes with. */
const REFRESH_KEY = 'koma.linkRefresh';
/** A token is renewed once it has less than this left (the bot's last two hours: every half hour or so). */
const RENEW_BEFORE_MS = 90 * 60_000;
/** How often an open page looks whether it's time. */
const CHECK_MS = 60_000;
/** How long a renewal is waited for (a connection waits for it: freshLink) before it's given up on, for now. */
const ASK_MS = 8000;

let current = token;
let refresh: string | null = null;
/** When the token runs out (Date.now(), the page's own clock: it goes on while the computer sleeps), as far as the page knows: 0, not known (renewed at once). */
let runsOut = 0;
/** Neither the token nor the refresh token is taken any more: nothing more to try (its hello says the link has run out). */
let dead = false;
let renewing: Promise<void> | null = null;

/** The link's token as it is now (renewed as it goes: freshLink); empty with no link. */
export const linkToken = (): string => current ?? '';

try {
  const saved = JSON.parse(store.get(sessionStorage, REFRESH_KEY) ?? 'null') as { link?: unknown; refresh?: unknown } | null;
  if (saved && saved.link === current && typeof saved.refresh === 'string') refresh = saved.refresh;
} catch {
  // (Nothing kept, or not readable: the link's own token is traded.)
}

/**
 * The link good for a while yet: renewed first when it has little time left (or how long isn't known: just opened).
 * Never fails: renewed or not, what the bot says to the hello is what counts.
 */
export function freshLink(): Promise<void> {
  if (!current || !server || dead || (runsOut > 0 && runsOut - Date.now() > RENEW_BEFORE_MS)) return Promise.resolve();
  return (renewing ??= renew()
    .catch(() => undefined)
    .finally(() => (renewing = null)));
}

/** Trades the refresh token (or, if there's none, or it's run out, the link's token) for a new token and refresh token. */
async function renew(): Promise<void> {
  const address = server as string;
  const tries = [...(refresh ? [{ refresh }] : []), { token: current }];
  for (const body of tries) {
    let res: Response;
    try {
      res = await fetch(`${apiFromSocket(address)}/api/link/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(ASK_MS) });
    } catch {
      return; // (No answer: tried again in a while.)
    }
    if (res.status >= 500) return;
    if (!res.ok) continue;
    const got = (await res.json()) as LinkRefresh;
    current = got.token;
    refresh = got.refresh;
    runsOut = Date.now() + got.lastsMs;
    params.set(watching ? 'w' : 't', got.token);
    history.replaceState(history.state, '', `${location.pathname}${location.search}#${params}`);
    store.set(sessionStorage, REFRESH_KEY, JSON.stringify({ link: got.token, refresh: got.refresh }));
    return;
  }
  dead = true;
}

// Renewed as the page opens, every so often while it's open, and as it's shown again (back from asleep).
if (current && server) {
  void freshLink();
  window.setInterval(() => void freshLink(), CHECK_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void freshLink();
  });
}

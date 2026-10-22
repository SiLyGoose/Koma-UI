import { store } from '../ui/account/account';
import { apiFromSocket } from '../ui/live/live';
import type { LinkRefresh } from '../../protocol/site';

/*
 * A game's link, from Discord or the front page: after the #, the player's token (t) and the bot's
 * WebSocket address (s). A link to watch someone play has w= in place of t= (watch-only: nothing on
 * the page can be pressed). The TechnoMagic Raid's has m=single when it was opened single player (a room
 * of the player's own) from the front page.
 *
 * The token is taken out of the address as the page opens (the rest stays), so the address shown, copied or shared
 * never carries it: the page keeps it in the tab's sessionStorage, by its path, with its refresh token, and a reload
 * (or going back to it) opens with what's kept there.
 *
 * Its token lasts a couple of hours (the bot's MINE_WEB.linkTtlMs), so an open page keeps it good (freshLink): as it
 * opens it trades it for a refresh token (POST /api/link/refresh), then that for a new token every so often and before
 * it connects again, so a page left open for long (its player away, the computer asleep) carries on.
 */

/** What the tab keeps of this page's link (sessionStorage): its token as it is now, whether it watches, and its refresh token. */
interface Kept {
  token: string;
  watch: boolean;
  refresh: string | null;
}

const KEPT_KEY = `koma.link:${location.pathname}`;

function readKept(): Kept | null {
  try {
    const kept = JSON.parse(store.get(sessionStorage, KEPT_KEY) ?? 'null') as Partial<Kept> | null;
    if (!kept || typeof kept.token !== 'string' || typeof kept.watch !== 'boolean') return null;
    return { token: kept.token, watch: kept.watch, refresh: typeof kept.refresh === 'string' ? kept.refresh : null };
  } catch {
    return null; // (Nothing kept, or not readable.)
  }
}

const params = new URLSearchParams(location.hash.slice(1));
/** The link's token in the address: just opened from Discord or the front page (null: a reload, it was taken out). */
const given = params.get('t') ?? params.get('w');
const kept = given === null ? readKept() : null;

export const watching = given !== null ? params.get('t') === null : (kept?.watch ?? false);
/** The token the page opened with (null: none): whether it has a link at all. The one to use is linkToken(). */
export const token = given ?? kept?.token ?? null;
export const server = params.get('s');
export const single = params.get('m') === 'single';

/** A token is renewed once it has less than this left (the bot's last two hours: every half hour or so). */
const RENEW_BEFORE_MS = 90 * 60_000;
/** How often an open page looks whether it's time. */
const CHECK_MS = 60_000;
/** How long a renewal is waited for (a connection waits for it: freshLink) before it's given up on, for now. */
const ASK_MS = 8000;

let current = token;
let refresh: string | null = kept?.refresh ?? null;
/** When the token runs out (Date.now(), the page's own clock: it goes on while the computer sleeps), as far as the page knows: 0, not known (renewed at once). */
let runsOut = 0;
/** Neither the token nor the refresh token is taken any more: nothing more to try (its hello says the link has run out). */
let dead = false;
let renewing: Promise<void> | null = null;

/** The link's token as it is now (renewed as it goes: freshLink); empty with no link. */
export const linkToken = (): string => current ?? '';

/** Keeps the link as it is now, for a reload. */
const keep = (): void => {
  if (current) store.set(sessionStorage, KEPT_KEY, JSON.stringify({ token: current, watch: watching, refresh } satisfies Kept));
};

// Just opened: kept, and taken out of the address.
if (given !== null) {
  keep();
  params.delete('t');
  params.delete('w');
  const rest = params.toString();
  history.replaceState(history.state, '', `${location.pathname}${location.search}${rest ? `#${rest}` : ''}`);
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
    keep();
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

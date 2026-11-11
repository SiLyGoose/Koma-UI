import { API, getSession, store } from '../shared/ui/account/account';
import { navigate } from '../shared/transition';
import { withQuery } from '../site/game-link';
import type { Me } from '../protocol/site';

/*
 * The Divine Punishment game (./main.ts) asking the bot, as the member logged in on the site and in the server picked on the
 * games page: the same session and server the site's pages keep (../site/session.ts), read here without the site's header,
 * which that module puts in (this page is in the games' frame). Errors are { status, error }; no answer, status 0.
 */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** The server picked on the games page (../site/session.ts keeps it under this key). */
const SERVER_KEY = 'koma.server';

let me: Me | null = null;

export const hasSession = (): boolean => getSession() !== null;
export const currentMe = (): Me | null => me;
/** The server picked, if they are in it (else the first they are in, once /api/me is in). */
export function currentServer(): string | null {
  const picked = store.get(localStorage, SERVER_KEY);
  if (!me) return picked;
  return me.servers.some((one) => one.id === picked) ? picked : (me.servers[0]?.id ?? null);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const session = getSession();
  try {
    const res = await fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}), ...init.headers } });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return res.ok ? { ok: true, data: body as T } : { ok: false, status: res.status, error: body.error ?? 'failed' };
  } catch {
    return { ok: false, status: 0, error: 'offline' };
  }
}

/** Who's logged in (/api/me), asked again each time (their zeiucoins change as they play). */
export async function loadMe(): Promise<ApiResult<Me>> {
  const res = await api<Me>('/api/me');
  if (res.ok) me = res.data;
  return res;
}

/** Why a game couldn't be opened (null: it is opening; the page goes). */
export type PlayRefusal = 'no_server' | 'not_member' | 'logged_out' | 'failed';

/** Asks the bot for a link to `game` in the server picked and goes there, alone, against `boss` (as ../site/play.ts does). */
export async function playGame(game: string, boss: string): Promise<PlayRefusal | null> {
  const server = currentServer();
  if (!server) return 'no_server';
  const res = await api<{ url: string }>('/api/play', { method: 'POST', body: JSON.stringify({ guild: server, game }) });
  if (res.ok) {
    // Single player: the game's page asks the bot for a room of the player's own (see ../shared/game/link.ts).
    navigate(`${withQuery(res.data.url, { boss })}&m=single`);
    return null;
  }
  return res.status === 401 ? 'logged_out' : res.error === 'not_member' ? 'not_member' : 'failed';
}

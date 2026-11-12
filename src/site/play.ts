import { navigate } from '../shared/transition';
import { withQuery } from './game-link';
import { api, currentServer, logOut } from './session';

/*
 * Opening a game from a site page: the bot hands out a link to it (POST /api/play, as its buttons in Discord do), and the
 * page goes there with what the game is to read from its address. The front page's Play buttons and Raid Lists
 * (../hub/page.ts) open the games this way (the Divine Punishment game's map has its own: ../divine/bot.ts).
 */

/** Why a game couldn't be opened (null: it is opening; the page goes). */
export type PlayRefusal = 'no_server' | 'not_member' | 'failed';

/**
 * Asks the bot for a link to `game` in the server picked and goes there: alone (`single`: a room of the player's own), against
 * `boss`, into raid `room` (or a new one: `new`). Logged out (the session ran out), to the front page.
 */
export async function playGame(game: string, opts: { single?: boolean; boss?: string | null; room?: string; v2?: boolean }): Promise<PlayRefusal | null> {
  const server = currentServer();
  if (!server) return 'no_server';
  const res = await api<{ url: string }>('/api/play', { method: 'POST', body: JSON.stringify({ guild: server, game }) });
  if (res.ok) {
    // Single player: the game's page asks the bot for a room of the player's own (see ../shared/game/link.ts).
    // (From v2: ?v2, the game played as v2 is.)
    const url = withQuery(res.data.url, { boss: opts.boss ?? null, room: opts.single ? null : (opts.room ?? null), v2: opts.v2 ? '1' : null });
    navigate(opts.single ? `${url}&m=single` : url);
    return null;
  }
  if (res.status === 401) logOut();
  return res.error === 'not_member' ? 'not_member' : 'failed';
}

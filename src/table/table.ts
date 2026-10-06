import '../shared/style.css';
import './table.css';
import { barSlot, setConn, soundButton } from '../shared/ui/frame/frame';
import { server, showMessage, token, watching } from '../shared/game';
import { apiFromSocket, startLive } from '../shared/ui';
import { setMuted } from '../shared/audio';
import { connect } from './connection';
import type { TableContext } from './context';
import { wireControls } from './controls';
import { buildPanel } from './panel';
import { render, renderTimer } from './render';
import type { TableGame } from './types';

export type { Pile, TableGame } from './types';

/*
 * A shared-table game in the browser (baccarat, roulette): everything but the game's own felt. The
 * link from Discord (or the front page) carries, after the #, the player's token (t) and the bot's
 * WebSocket address (s); the bot seats them at a table with others.
 *
 * Each round has a betting time (the bar under the table counts it down). Chips are dragged from
 * the rack onto the spots (or a chip is picked and the spots tapped), and every change is sent to
 * the bot, which shows it to the whole table: the other players' chips are on the spots by their
 * profile pictures, and the list beside the table says who is at it, their balance, and what they
 * have down. When the time is up the bot deals one round for everyone; the game shows it (dealing
 * the cards out, spinning the wheel) and then how each player did. Then the next round's betting
 * starts.
 *
 * A game's page has, in its HTML: `#felt` with its spots (elements with `data-spot`) and `#result`
 * (with `#result-title` and `#result-text`) on it, an empty `[data-table-panel]` and
 * `[data-table-players]` (filled in here, ./panel.ts), and the frame's data-title on its <main> (the
 * table's number goes after it). The rest is its TableGame (./types.ts).
 *
 * The table's parts share one TableContext (./context.ts): render/ draws it; chips/betting.ts puts chips
 * down and takes them back, from the rack (chips/rack.ts), dragging (chips/drag.ts) and the buttons (controls.ts);
 * round.ts shows a round on the felt; connection.ts talks to the bot. A game draws its chips with
 * chips/piles.ts and chips/chips.ts.
 */

/** Plays `game` on this page. */
export function startTable<S extends string, R, X = unknown>(game: TableGame<S, R, X>): void {
  const ctx: TableContext<S, R, X> = {
    game,
    ui: buildPanel(),
    watching,
    watched: '',
    socket: null,
    state: null,
    bets: {},
    history: [],
    selected: 0,
    deadline: 0,
    bettingWhole: 60_000,
    shownRound: 0,
    dealingOut: false,
    rackBuilt: false,
    adoptBets: false,
    seq: 0,
    playing: 0,
  };
  ctx.ui.dealVote.textContent = game.words.button;
  soundButton(`${game.key}-muted`, setMuted);
  wireControls(ctx);

  setInterval(() => renderTimer(ctx), 200);
  render(ctx);
  if (!token || !server) {
    setConn('No link', 'bad');
    showMessage('Open this from the games page', `Log in on the games page and pick ${game.title}, or use the ${game.name} command in Discord.`);
  } else {
    connect(ctx, server, token);
    startLive({ mount: barSlot(), api: apiFromSocket(server), auth: () => `Game ${token}`, newTab: !watching });
  }
}

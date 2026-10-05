import '../shared/style.css';
import { barSlot, setConn, soundButton } from '../shared/frame';
import { server, token, watching } from '../shared/game/link';
import { showMessage } from '../shared/game/message';
import { setMuted } from '../shared/sfx';
import { apiFromSocket, startLive } from '../shared/live';
import './mines.css';
import { buildBoard } from './board';
import { connect } from './connection';
import { wireLobby } from './lobby';
import { render } from './render';
import { cashOut, pick, startRound } from './round';
import { playing, state } from './state';
import { installGemGradients } from './tile-art';
import { ui } from './ui';

/*
 * The mine, played in the browser like Stake's Mines. The link from Discord (or the front page)
 * carries, after the #, the player's token (t) and the bot's WebSocket address (s). The bot holds the
 * board and decides every pick; this page sends the bets, picks and cash outs, and shows what it is told.
 *
 * Between rounds the panel takes a bet and a number of mines; during a round the tiles can be turned
 * over one at a time (the next only once the bot has answered), and the button cashes out.
 *
 * Its parts: board.ts (the tiles) and panel.ts, drawn by render.ts; lobby.ts takes the bet and mines,
 * round.ts bets, picks and cashes out; connection.ts talks to the bot; state.ts holds what more than
 * one of them needs.
 */

installGemGradients();
buildBoard();
wireLobby();
soundButton('mines-muted', setMuted);

ui.panel.addEventListener('submit', (e) => {
  e.preventDefault();
  if (playing()) cashOut();
  else startRound();
});
ui.random.addEventListener('click', () => pick('random'));

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (e.code === 'KeyR' && playing() && document.activeElement !== ui.bet) {
    e.preventDefault();
    pick('random');
  }
});

// A round left alone cashes out by itself: say so when it's getting close.
setInterval(() => {
  const { run } = state;
  if (watching || !playing() || !run) return;
  const left = Math.ceil((run.idleMs - (performance.now() - state.lastActivity)) / 1000);
  ui.idle.hidden = left > 15;
  if (!ui.idle.hidden) ui.idle.textContent = `💤 Cashing out by itself in ${Math.max(0, left)}s unless you pick a tile.`;
}, 250);

render();
if (!token || !server) {
  setConn('No link', 'bad');
  showMessage('Open this from the games page', 'Log in on the games page and pick Mines, or use the mine command in Discord.');
} else {
  connect(server, token);
  // Who else is on the site, and a way to watch them (asked with this page's own link).
  startLive({ mount: barSlot(), api: apiFromSocket(server), auth: () => `Game ${token}`, newTab: !watching });
}

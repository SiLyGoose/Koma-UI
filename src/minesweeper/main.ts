import '../shared/style.css';
import './minesweeper.css';
import { barSlot, setConn, soundButton } from '../shared/ui/frame/frame';
import { gameSocket, server, showMessage, token, watching } from '../shared/game';
import { apiFromSocket, startLive } from '../shared/ui';
import { setMuted } from '../shared/audio';
import { renderBoard, wireBoard } from './board';
import { clearCursors, moveCursor, syncCursors, wireCursor } from './cursors';
import { renderHead, renderTime, wireHead } from './head';
import { renderPlayers } from './players';
import type { ClientMessage, ErrorCode, RoomState, ServerMessage } from './protocol';
import { play } from './sfx';
import { state } from './state';

/*
 * Minesweeper, played together. The link from Discord (or the front page) carries, after the #, the
 * player's token (t) and the bot's WebSocket address (s); the bot puts them in their server's room,
 * where everyone plays the same board. The bot holds the board and decides every click; this page
 * sends the clicks and draws what it's told, so nothing here gives away where the mines are.
 *
 * Its parts: board.ts (the tiles and their clicks), cursors.ts (the other players' cursors over the
 * board, and telling them this page's), head.ts (the levels, and the mines left, the face and the
 * time above the board), players.ts (who's here, and their records); state.ts holds what more than
 * one of them needs.
 */

const ERRORS: Record<ErrorCode, [string, string]> = {
  bad_token: ['This link has run out', 'Open Minesweeper again from the games page or from Discord for a new one.'],
  replaced: ['Opened somewhere else', 'Minesweeper is open in another tab or window. Only one can play at a time.'],
  bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
  full: ['The room is full', 'As many people as can are already playing in this server. Try again in a bit.'],
};

function render(): void {
  renderBoard();
  renderHead();
  renderPlayers();
  syncCursors();
}

function showRoom(room: RoomState): void {
  const before = state.room?.game ?? null;
  state.room = room;
  const { game } = room;
  if (game.status === 'playing') state.clockAt = performance.now() - game.elapsedMs;
  // A board this page saw being played just ended.
  if (before?.no === game.no && before.status !== game.status) {
    if (game.status === 'lost') play('boom');
    else if (game.status === 'won') play('win');
  }
  render();
}

function receive(message: ServerMessage): void {
  switch (message.t) {
    case 'error': {
      state.socket?.finish();
      const [title, text] = ERRORS[message.code] ?? ERRORS.bad_message;
      showMessage(title, text);
      setConn('Disconnected', 'bad');
      return;
    }
    case 'room':
      showRoom(message.state);
      return;
    case 'cursor':
      moveCursor(message.id, message.at);
      return;
  }
}

soundButton('minesweeper-muted', setMuted);
wireBoard();
wireCursor();
wireHead();
setInterval(renderTime, 250);
render();

if (watching) {
  setConn('Not watchable', 'bad');
  showMessage("Minesweeper isn't watched", 'Everyone in the server plays the same board: open Minesweeper from the games page to join in.');
} else if (!token || !server) {
  setConn('No link', 'bad');
  showMessage('Open this from the games page', 'Log in on the games page and pick Minesweeper, or use the minesweeper command in Discord.');
} else {
  const link = token;
  state.socket = gameSocket<ServerMessage, ClientMessage>({
    server,
    hello: () => ({ t: 'hello', token: link }),
    receive,
    onDrop: clearCursors,
  });
  startLive({ mount: barSlot(), api: apiFromSocket(server), auth: () => `Game ${token}`, newTab: true });
}

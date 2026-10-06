/*
 * What every game's page shares: its link (link.ts), the box saying why it can't go on
 * (message.ts) and the connection to the bot (socket.ts, which shows itself in the frame: games only).
 */

export { server, token, watching } from './link';
export { hideMessage, showMessage } from './message';
export { gameSocket, type GameSocket } from './socket';

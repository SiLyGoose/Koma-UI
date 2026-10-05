import { apiFromSocket } from '../shared/live';

/* The raid's link: after the #, the player's token (t) and the bot's web socket (s), like every game's. */

const params = new URLSearchParams(location.hash.slice(1));
export const token = params.get('t');
export const server = params.get('s');
/** The bot's web address (for the boss's picture, and the online list). */
export const api = server ? apiFromSocket(server) : '';

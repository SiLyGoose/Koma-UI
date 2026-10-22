import { server } from '../shared/game/link';
import { apiFromSocket } from '../shared/ui';

/* The raid's link: after the #, the player's token (t) and the bot's web socket (s), like every game's (renewed as it goes). */

export { linkToken, server, token } from '../shared/game/link';
/** The bot's web address (for the boss's picture, and the online list). */
export const api = server ? apiFromSocket(server) : '';

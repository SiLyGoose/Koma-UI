/*
 * A game's link, from Discord or the front page: after the #, the player's token (t) and the bot's
 * WebSocket address (s). A link to watch someone play has w= in place of t= (watch-only: nothing on
 * the page can be pressed).
 */

const params = new URLSearchParams(location.hash.slice(1));
const watchToken = params.get('w');

export const watching = watchToken !== null;
export const token = params.get('t') ?? watchToken;
export const server = params.get('s');

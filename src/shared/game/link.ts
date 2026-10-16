/*
 * A game's link, from Discord or the front page: after the #, the player's token (t) and the bot's
 * WebSocket address (s). A link to watch someone play has w= in place of t= (watch-only: nothing on
 * the page can be pressed). The TechnoMagic Raid's has m=single when it was opened single player (a room
 * of the player's own) from the front page.
 */

const params = new URLSearchParams(location.hash.slice(1));
const watchToken = params.get('w');

export const watching = watchToken !== null;
export const token = params.get('t') ?? watchToken;
export const server = params.get('s');
export const single = params.get('m') === 'single';

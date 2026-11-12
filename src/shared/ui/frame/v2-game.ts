import { landscapeSheets } from '../../../v2/landscape-css';
import './v2-game.css';

/*
 * A game opened from v2 (its link with ?v2: v2's casino, ../../../v2/casino.ts), played as v2 is: on its side, filling the
 * screen, no frame round it (no border, no title bar: ./v2-game.css), King's Raid's back button at its top left back to v2's
 * casino, the sound button and the connection at the foot of the thin rail it's on (the online players left out). It is laid out as on a desktop whatever the screen
 * (its styles rewritten in place: ../../../v2/landscape-css.ts landscapeSheets), on a canvas DESIGN_HEIGHT high and as wide
 * as the screen's shape makes it, scaled to the screen: all of it on one screen, nothing to scroll or zoom. Held upright,
 * a phone is asked to turn sideways, as v2's town asks.
 */

/** Whether this game was opened from v2. */
export const V2_GAME = new URLSearchParams(location.search).has('v2');

/** Where its back button goes: v2's casino. */
export const V2_BACK = '/v2/casino/';

/** The height a game is laid out for, before it's scaled to the screen: the games' desktop layout, whole. */
const DESIGN_HEIGHT = 760;

/** The game's frame (`main.frame`) made v2's: on a canvas scaled to the screen, its styles a desktop's. */
export function startV2Game(frame: HTMLElement | null): void {
  const root = document.documentElement;
  root.classList.add('v2-game');
  landscapeSheets();
  if (!frame) return;
  statusOverPlayers(frame);
  // (Sized to the screen as it is, until the landscape module is in: then to the page as laid out, turned by hand or not.)
  let size = (): { width: number; height: number } => ({ width: innerWidth, height: innerHeight });
  const fit = (): void => {
    const { width, height } = size();
    if (!width || !height) return;
    const scale = height / DESIGN_HEIGHT;
    const across = width / scale;
    frame.style.width = `${across}px`;
    frame.style.height = `${DESIGN_HEIGHT}px`;
    frame.style.transform = `scale(${scale})`;
    root.style.setProperty('--v2-vh', `${DESIGN_HEIGHT / 100}px`);
    root.style.setProperty('--v2-vw', `${across / 100}px`);
  };
  fit();
  addEventListener('resize', fit);
  // (Only for a game opened from v2: the site's own games never load it.)
  void import('../landscape/landscape').then(({ landscapeCover, onLandscape, pageSize }) => {
    landscapeCover(document.body, { title: 'Turn your phone sideways', text: 'The games are played in landscape, filling the screen.' });
    size = pageSize;
    onLandscape(fit);
    fit();
  });
}

/**
 * The sound button and the connection in a box of their own: a table game's over the players and the chat (`.tb-players`:
 * the two, one column, in place of the list alone); Poker's over its panel (the moves) and its chat, which become a column
 * beside the table; Mines' over its bet panel, the left of its game (a row over the game, the box as wide as the panel).
 */
function statusOverPlayers(frame: HTMLElement): void {
  const players = frame.querySelector<HTMLElement>('.tb-players');
  const poker = frame.querySelector<HTMLElement>('.pk-layout > .pk-panel');
  const mines = frame.querySelector<HTMLElement>('.mx > .mx-game');
  const sound = frame.querySelector<HTMLElement>('.top .frame-sound');
  const conn = frame.querySelector<HTMLElement>('.top .conn');
  if (!sound || !conn || (!players && !poker && !mines)) return;
  const status = document.createElement('div');
  status.className = 'v2-game-status';
  status.append(sound, conn);
  if (players || poker) {
    const side = document.createElement('div');
    side.className = 'v2-game-side';
    const column = (players ?? poker) as HTMLElement;
    column.before(side);
    side.append(status, column);
    const chat = poker && frame.querySelector<HTMLElement>('.pk-layout > .pk-chat');
    if (chat) side.append(chat);
  } else if (mines) {
    const row = document.createElement('div');
    row.className = 'v2-game-status-row';
    row.append(status);
    mines.before(row);
  }
}

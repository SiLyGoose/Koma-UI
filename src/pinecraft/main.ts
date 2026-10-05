import '../shared/style.css';
import { barSlot, setConn, soundButton } from '../shared/frame';
import { server, token, watching } from '../shared/game/link';
import { showMessage } from '../shared/game/message';
import { apiFromSocket, startLive } from '../shared/live';
import { setMuted } from '../shared/sfx';
import { resize } from './camera';
import { connect } from './connection';
import { setUpHowToPlay } from './how-to-play';
import { wireJoystick } from './input/joystick';
import { wireKeyboard } from './input/keyboard';
import { startLeaderboard } from './leaderboard';
import { linkUser } from './link-user';
import { frame } from './loop';
import { wireMap } from './map';
import './pinecraft.css';
import { loadSounds } from './sfx';
import { state } from './state';
import { loadKeysPicture, loadTextures } from './textures';
import { ui } from './ui';

/*
 * Pinecraft, played in the browser. The link carries, after the #, the player's token (t) and the
 * bot's WebSocket address (s). The bot holds the world and decides every dig; this page sends the
 * moves and draws what it is told.
 *
 * Walking through open ground can't change anything, so the page moves the character at once and tells
 * the bot afterwards. A block is broken like in Minecraft: hold the direction against it (the keys,
 * or the joystick on a phone) and it cracks, taking longer the harder it is (the bot's
 * breakMs), and letting go starts it over. The page tells the bot when it starts (`mine`) and when it is done (`move`), then waits for the bot's
 * answer before any other move. Holding a direction keeps going.
 *
 * Its parts: connection.ts talks to the bot, and apply.ts takes in what it says (watch.ts when
 * watching); digging.ts makes the moves, from input/ (the keys and the joystick); loop.ts draws every
 * frame (with draw/), and hud.ts, ore-tip.ts and map.ts the rest; state.ts holds what more than one
 * of them needs.
 */

new ResizeObserver(resize).observe(ui.wrap);
wireKeyboard();
wireJoystick();
setUpHowToPlay();
wireMap();
soundButton('pinecraft-muted', setMuted);

resize();
if (!token || !server) {
  setConn('No link', 'bad');
  showMessage('Open this from the games page', 'Log in on the games page and pick Pinecraft, or use the pinecraft command in Discord.');
} else {
  void loadTextures();
  void loadKeysPicture();
  loadSounds();
  connect(server, token);
  requestAnimationFrame(frame);
  // Who else is on the site, and a way to watch them (asked with this page's own link).
  startLive({ mount: barSlot(), api: apiFromSocket(server), auth: () => `Game ${token}`, newTab: !watching });
  state.leaderboard = startLeaderboard({ mount: document.querySelector('.pinecraft > .hud') as HTMLElement, api: apiFromSocket(server), auth: () => `Game ${token}`, you: () => linkUser });
}

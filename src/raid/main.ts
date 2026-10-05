import '../shared/style.css';
// The dropdown's chevron (.dd-arrow), on the end screen's sorted column.
import '../shared/dropdown.css';
import { barSlot, setConn, soundButton } from '../shared/frame';
import { startLive } from '../shared/live';
import { setMuted } from '../shared/sfx';
import { connect } from './connection';
import { wireActions } from './fight/actions';
import { wireGearPopup } from './gear-popup';
import { setUpLandscape } from './landscape';
import { api, server, token } from './link';
import { showMessage } from './message';
import { wirePrep } from './prep/prep';
import { wireResultSort } from './result/result';
import { wireStats } from './result/stats';
import { tick } from './timers';
import { ui } from './ui';
import './raid.css';

/*
 * The weekly raid, in the browser: the same lobby and fight as the raid's message in Discord (the
 * bot runs it; this page shows it and sends what's pressed). The link carries, after the #, the
 * player's token (t) and the bot's web socket (s), like every game's.
 *
 * With no raid going on it shows how this week's stands, and can start it: its lobby goes up in the
 * server's channel in Discord too, and anyone there or here can join.
 *
 * Its parts: render.ts draws whatever the bot sends, through prep/ (the party screen before the
 * fight), fight/ (the fight: the party row, healing, the action buttons) and result/ (the end screen
 * and its More stats); gear-popup.ts shows a raider's gear; connection.ts talks to the bot; state.ts
 * holds what more than one of them needs.
 */

// The gear popup's Escape goes first: More stats only closes on one with no gear open over it.
wireGearPopup();
wireStats();
wireResultSort();
setInterval(tick, 250);
wirePrep();
wireActions();

soundButton('raid-muted', setMuted);
// On a phone (or a short screen) the log starts folded away, leaving the boss and the party in view.
if (window.matchMedia('(max-width: 700px), (max-height: 520px)').matches) ui.logPanel.open = false;
setUpLandscape();

if (!token || !server) {
  setConn('No link', 'bad');
  showMessage('Open this from the games page', 'Log in on the games page and pick Raid, or use the Play on the web button on the raid in Discord.');
} else {
  connect(server, token);
  startLive({ mount: barSlot(), api, auth: () => `Game ${token}`, newTab: true });
}

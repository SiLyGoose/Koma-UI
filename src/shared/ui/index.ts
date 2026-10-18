/*
 * The parts of the site every page shows, each in its own folder with its styles: the profile button
 * and login session (account/), the star chart behind the site (backdrop/), the buttons and what they
 * show while working (button/), the chat beside a game played together (chat/), the X that closes a popup or leaves a section (close/), the site's
 * dropdown (dropdown/), who's online (live/), "Reconnecting…"
 * (reconnect/) and the server picker (server-options/), and the site header (header/).
 *
 * Not frame/: importing it sets up a game's page (the cursor, the click sounds, the way back), so only
 * a game imports it, as ./frame/frame. Nor landscape/: importing it watches which way round the screen is
 * (the cover asking to turn the phone, and the page turned for it), so only a game played sideways imports it.
 */

export { API, arrow, getSession, loadUser, profileMenu, setSession, store, type MenuItem, type User } from './account/account';
export { backdrop } from './backdrop/backdrop';
export { busyWith, doneMark, working, type Busy } from './button/button';
export { chatBox, type ChatBox, type ChatClientMessage, type ChatLine, type ChatServerMessage } from './chat/chat';
export { closeButton, closeMark } from './close/close';
export { dropdown, type Dropdown } from './dropdown/dropdown';
export { siteHeader, type SiteHeader } from './header/header';
export { apiFromSocket, showWatchers, showWatching, startLive, watchAway, watchBack, type LiveOptions } from './live/live';
export { reconnecting } from './reconnect/reconnect';
export { fillServers } from './server-options/server-options';

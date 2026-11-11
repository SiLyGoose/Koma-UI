import '../shared/style.css';
import '../shared/ui/button/button.css';
import { setConn, soundButton } from '../shared/ui/frame/frame';
import { setMuted } from '../shared/audio';
import { landscapeCover } from '../shared/ui/landscape/landscape';
import { navigate } from '../shared/transition';
import './divine.css';
import { mount } from './page';

/*
 * King's Raid's Divine Punishment Raid as a game (games/punishment/): its windows (./page.ts) in the games' frame, filling the
 * screen under its bar, as every game is, and (on a phone) played sideways like the raid it opens (../shared/ui/landscape/). Its zeiucoins go on the bar beside the sound button; the bar's ← goes a window up
 * (from the first, out to the games). It asks the bot as the member logged in on the site (../site/session.ts), in the server
 * picked on the games page; its boss fights are the raid page's (games/divine/), opened from its map.
 */

const app = document.getElementById('app') as HTMLElement;

// Played sideways, as the raid it opens is: on a phone held upright, a cover asking to turn it, with the button that does it.
landscapeCover(app, {
  title: 'Turn your phone sideways',
  text: 'The Divine Punishment Raid is played in landscape.',
  back: { go: () => navigate('/', { back: true }) },
});
const bar = app.querySelector('.top') as HTMLElement;
const balance = document.createElement('span');
balance.className = 'dp-balance';
balance.hidden = true;
bar.querySelector('.frame-sound')?.before(balance);
soundButton('divine-muted', setMuted);

// The bar's ←, a button of the page's own (the frame's is a link the site's transition takes straight to the games): a window
// up, and from the first out to the games (./page.ts).
const link = bar.querySelector('.back') as HTMLAnchorElement;
const back = document.createElement('button');
back.type = 'button';
back.className = 'back dp-back';
back.textContent = link.textContent;
back.setAttribute('aria-label', 'Back to the games');
link.replaceWith(back);

mount(app, {
  back,
  title: bar.querySelector('h1') as HTMLElement,
  balance,
  conn: setConn,
});

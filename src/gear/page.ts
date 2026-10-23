import markup from './gear.html?raw';
import { API } from '../shared/ui';
import { go } from '../site/nav';
import type { Page } from '../site/page';
import { api, currentMe, currentServer, loadMe, logOut, prefetchFor, setServer } from '../site/session';
import { mountGear } from './view';

/* The site's Player page (/player/): the gear view (./view/), for the member logged in, in the server they pick. */

export const gearPage: Page = {
  title: 'Player · Komaverse',
  icon: '⚔️',
  markup,
  mount: (root) => mountGear(root, { api, ready: !!API, me: currentMe, loadMe, server: currentServer, setServer, logOut, go: (href) => go(href) }),
  prefetch: () => prefetchFor((guild) => `/api/gear?guild=${guild}`, (guild) => `/api/gear/members?guild=${guild}`),
};

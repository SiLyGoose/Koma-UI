import markup from './gear.html?raw';
import { API } from '../shared/account';
import { go } from '../site/nav';
import type { Page } from '../site/page';
import { api, currentMe, currentServer, loadMe, logOut, setServer } from '../site/session';
import { mountGear } from './view';

/* The site's gear page: the gear view (./view.ts), for the member logged in, in the server they pick. */

export const gearPage: Page = {
  path: '/gear',
  title: 'Gear · Komaverse',
  icon: '⚔️',
  markup,
  needsLogin: true,
  mount: (root) => mountGear(root, { api, ready: !!API, me: currentMe, loadMe, server: currentServer, setServer, logOut, go: (href) => go(href) }),
};

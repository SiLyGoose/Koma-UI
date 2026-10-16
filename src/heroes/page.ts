import markup from './heroes.html?raw';
import { API } from '../shared/ui';
import type { Page } from '../site/page';
import { api, currentMe, currentServer, loadMe, logOut, setServer } from '../site/session';
import { mountHeroes } from './view';

/* The site's heroes page: the heroes view (./view.ts), for the member logged in, in the server they pick. */

export const heroesPage: Page = {
  title: 'Heroes · Komaverse',
  icon: '🐲',
  markup,
  mount: (root) => mountHeroes(root, { api, ready: !!API, me: currentMe, loadMe, server: currentServer, setServer, logOut }),
};


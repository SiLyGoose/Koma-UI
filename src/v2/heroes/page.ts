import markup from './heroes.html?raw';
import { API } from '../../shared/ui';
import { mountHeroes } from '../../heroes/view';
import { go } from '../../site/nav';
import type { Page } from '../../site/page';
import { api, currentMe, currentServer, loadMe, logOut, prefetchFor, setServer } from '../../site/session';

/*
 * v2's heroes page: for now a copy of the site's (../../heroes/page.ts), its markup copied here (./heroes.html) so v2 can
 * change it for its landscape window without changing the site's; run by the same code (../../heroes/view.ts) with the
 * site's styles.
 */

export const heroesPage: Page = {
  title: 'Heroes · Komaverse',
  icon: '🐲',
  markup,
  mount: (root) => mountHeroes(root, { api, ready: !!API, me: currentMe, loadMe, server: currentServer, setServer, logOut, site: true, go: (href) => go(href) }),
  prefetch: () => prefetchFor((guild) => `/api/heroes?guild=${guild}`, (guild) => `/api/heroes/members?guild=${guild}`),
};

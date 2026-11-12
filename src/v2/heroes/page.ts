import markup from './heroes.html?raw';
import './heroes.css';
import { API } from '../../shared/ui';
import { mountHeroes } from '../../heroes/view';
import { go } from '../../site/nav';
import type { Page } from '../../site/page';
import { api, currentMe, currentServer, loadMe, logOut, prefetchFor, setServer } from '../../site/session';

/*
 * v2's heroes page: the site's heroes page (../../heroes/view.ts, its code and features as they are) in v2's markup
 * (./heroes.html), drawn as King's Raid's Hero Info window (./heroes.css): the game's 1080-high screen scaled to this one,
 * as wide as this one is (2100 at least, the window's own width and its margins).
 */

const SCREEN = { width: 2100, height: 1080 };

export const heroesPage: Page = {
  title: 'Heroes · Komaverse',
  icon: '🐲',
  markup,
  mount: (root) => {
    const stage = root.querySelector('.v2-hero-stage') as HTMLElement;
    const fit = new ResizeObserver(() => {
      const scale = Math.min(root.clientWidth / SCREEN.width, root.clientHeight / SCREEN.height) || 1;
      stage.style.setProperty('--s', String(scale));
      stage.style.width = `${root.clientWidth / scale}px`;
    });
    fit.observe(root);
    const heroes = mountHeroes(root, { api, ready: !!API, me: currentMe, loadMe, server: currentServer, setServer, logOut, site: true, go: (href) => go(href) });
    return {
      drawn: heroes.drawn,
      unmount: () => {
        fit.disconnect();
        heroes.unmount();
      },
    };
  },
  prefetch: () => prefetchFor((guild) => `/api/heroes?guild=${guild}`, (guild) => `/api/heroes/members?guild=${guild}`),
};

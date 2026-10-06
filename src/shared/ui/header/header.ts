import './header.css';

/*
 * The site header, on every site page (the games have their frame instead, ../frame/frame.ts): the
 * name on the left, and on the right the pages' links, who's online and the profile button, or Login.
 * The site's session fills in who's logged in (../../../site/session.ts); its router marks the page
 * it's on (../../../site/main.ts, by each link's data-route).
 */

/** The pages in the header, in order: their links, and the route each marks (the router's page.path). */
const LINKS: readonly { label: string; href: string; route: string }[] = [
  { label: 'Games', href: '/#games', route: '/' },
  { label: 'Gear', href: '/gear/', route: '/gear' },
  { label: 'Forge', href: '/forge/', route: '/forge' },
  { label: 'Wish', href: '/banner/', route: '/banner' },
  { label: 'Databank', href: '/databank/', route: '/databank' },
];

export interface SiteHeader {
  /** The pages' links, each with its data-route. */
  links: HTMLAnchorElement[];
  /** Where the profile button goes once someone's logged in (hidden until then). */
  me: HTMLElement;
  /** Login, for no one logged in (hidden until the session says so). */
  login: HTMLButtonElement;
}

let header: SiteHeader | null = null;

/** The site header, put in at the top of the page the first time it's asked for. */
export function siteHeader(): SiteHeader {
  if (header) return header;
  const root = document.createElement('header');
  root.className = 'site-header';
  root.innerHTML = `
    <a class="site-logo" href="/">
      <span class="site-logo-title"><span class="site-logo-long">Komaverse</span><span class="site-logo-short" aria-hidden="true">KV</span></span>
    </a>
    <div class="site-nav-wrapper">
      <nav class="site-nav"><ul class="site-nav-list"></ul></nav>
      <div class="site-user" hidden></div>
      <button type="button" class="site-login" hidden>Login</button>
    </div>`;
  const list = root.querySelector('.site-nav-list') as HTMLElement;
  const links = LINKS.map(({ label, href, route }) => {
    const link = document.createElement('a');
    link.className = 'site-nav-link';
    link.href = href;
    link.dataset.route = route;
    link.textContent = label;
    const item = document.createElement('li');
    item.append(link);
    list.append(item);
    return link;
  });
  document.body.prepend(root);
  header = {
    links,
    me: root.querySelector('.site-user') as HTMLElement,
    login: root.querySelector('.site-login') as HTMLButtonElement,
  };
  return header;
}

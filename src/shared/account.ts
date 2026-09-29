import './account.css';

/*
 * Who's logged in, for every page: the session the front page keeps (from logging in with Discord
 * through the bot's /api), the member it belongs to, and the profile button that shows them, with
 * its drop-down (styled like JavNext's header).
 */

export const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '');
const SESSION_KEY = 'koma.session';

// Browser storage can be off (a private window, blocked site data): the page still works, it just forgets.
export const store = {
  get: (s: Storage, key: string): string | null => {
    try {
      return s.getItem(key);
    } catch {
      return null;
    }
  },
  set: (s: Storage, key: string, value: string | null): void => {
    try {
      if (value === null) s.removeItem(key);
      else s.setItem(key, value);
    } catch {
      // Not kept.
    }
  },
};

export const getSession = (): string | null => store.get(localStorage, SESSION_KEY);
export const setSession = (session: string | null): void => store.set(localStorage, SESSION_KEY, session);

export interface User {
  id: string;
  name: string;
  avatar: string;
}

/** The member logged in on this browser, or null (not logged in, or the bot can't be reached). */
export async function loadUser(): Promise<User | null> {
  const session = getSession();
  if (!API || !session) return null;
  try {
    const res = await fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${session}` } });
    if (!res.ok) return null;
    return ((await res.json()) as { user: User }).user;
  } catch {
    return null;
  }
}

export interface MenuItem {
  label: string;
  icon?: keyof typeof ICONS;
  /** Where it goes, or what it does. */
  href?: string;
  onSelect?: () => void;
  /** A class for its row (to show it only on some screens, say). */
  className?: string;
}

const ICONS = {
  servers:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6z"/><circle cx="17" cy="9" r="2.8"/><path d="M16.2 13.1c3 .2 5.3 2.3 5.3 5.9h-4.2c0-2.3-.4-4.2-1.1-5.9z"/></svg>',
  games:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10a5 5 0 0 1 4.9 6l-.8 4a2.6 2.6 0 0 1-4.4 1.3L14.5 16h-5l-2.2 2.3A2.6 2.6 0 0 1 2.9 17l-.8-4A5 5 0 0 1 7 7zm0 3v1.5H5.5v2H7V15h2v-1.5h1.5v-2H9V10zm8.5 1a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm2.5-1.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/></svg>',
  gear:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 2.5 21.5 4.5 11 15l-1.3-.2-.5-.5L9 13z"/><path d="M5.2 13.4 10.6 18.8 9.2 20.2 7.8 18.8 5.3 21.3a1.4 1.4 0 0 1-2-2l2.5-2.5-1.4-1.4z"/></svg>',
  forge:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 7h15c0 2.8 1.9 4.3 5 4.6V14c-2.4 0-4 .9-5 2.6V18h2v3H6v-3h2v-1.4C5.3 15.5 3.3 13 2 10z"/></svg>',
  databank:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3.5A2.5 2.5 0 0 1 7.5 1H20v17H7.5a1 1 0 0 0 0 2H20v3H7.5A4.5 4.5 0 0 1 3 18.5V5.5z"/><path d="M9 5.5h7v2H9z" fill="rgb(0 0 0 / 35%)"/></svg>',
  logout:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4v-2.4H6.4V6.4H10z"/><path d="M15.5 7.2 21 12l-5.5 4.8v-3.3H9.5v-3h6z"/></svg>',
} as const;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Every drop-down open, so opening one (or clicking anywhere else) closes the rest. */
const openMenus = new Set<() => void>();
document.addEventListener('click', () => {
  for (const close of openMenus) close();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') for (const close of openMenus) close();
});

/**
 * A button that drops down a list of items below it (lined up with its right edge). `wrap` holds
 * both; the button's arrow turns while it's open.
 */
export function dropdown(button: HTMLButtonElement, items: MenuItem[]): HTMLElement {
  const wrap = el('div', 'account-dropdown');
  const list = el('ul', 'account-menu');
  list.hidden = true;
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-expanded', 'false');
  const close = (): void => {
    list.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    openMenus.delete(close);
  };
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!list.hidden) return close();
    for (const other of openMenus) other();
    list.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    openMenus.add(close);
  });
  // A click inside the list isn't one "anywhere else" (its items close it themselves).
  list.addEventListener('click', (e) => e.stopPropagation());
  for (const item of items) {
    const li = el('li', item.className ?? '');
    const link = el('a', 'account-item');
    link.href = item.href ?? '#';
    if (item.icon) {
      const icon = el('span', 'account-icon');
      icon.innerHTML = ICONS[item.icon];
      link.append(icon);
    }
    link.append(el('span', 'account-item-name', item.label));
    link.addEventListener('click', (e) => {
      if (item.onSelect) {
        e.preventDefault();
        item.onSelect();
      }
      close();
    });
    li.append(link);
    list.append(li);
  }
  wrap.append(button, list);
  return wrap;
}

/** The drop-down arrow, turning while open. */
export const arrow = (): HTMLSpanElement => el('span', 'account-arrow');

/** The profile button: the member's picture, name and an arrow, dropping down `items`. */
export function profileMenu(user: User, items: MenuItem[]): HTMLElement {
  const button = el('button', 'account-user');
  button.type = 'button';
  button.setAttribute('aria-label', `${user.name}: account`);
  const avatar = el('img', 'account-avatar');
  avatar.src = user.avatar;
  avatar.alt = '';
  avatar.width = 32;
  avatar.height = 32;
  button.append(avatar, el('span', 'account-name', user.name), arrow());
  return dropdown(button, items);
}

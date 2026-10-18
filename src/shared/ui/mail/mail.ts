import './mail.css';
import type { MailboxView, MailClaimed, MailView } from '../../../protocol/mail';

/*
 * The mailbox, in the site header: a mail icon beside the profile button, with how many mails are unread on it (none: no
 * badge). Pressing it opens the mailbox: each mail (the newest first) with its message and what it carries, and Claim for
 * what it carries; a Unique Weapon or Unique Treasure Ticket picks its hero (and a unique treasure, which of its four) first.
 * Opening it marks the mail read. The bot's GET /api/mail, POST /api/mail/read and /claim (its services/mail.ts).
 */

type Api = <T>(path: string, init?: RequestInit) => Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }>;

export interface MailHost {
  api: Api;
  /** The server picked (null: none yet). */
  server: () => string | null;
  /** The member's balance changed (a claim paid zeiucoins). */
  changed?: () => void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const ENVELOPE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2.4V17h16V7.4l-8 5.3-8-5.3ZM5.2 7 12 11.5 18.8 7H5.2Z"/></svg>';

/** What the bot answered a claim with that wasn't a claim, said for the member. */
const CLAIM_ERRORS: Record<string, string> = {
  claimed: 'Already claimed.',
  needs_pick: 'Pick what you want first.',
  bad_pick: 'Pick a hero (and a unique treasure) first.',
  not_found: 'That mail is gone.',
};

/** The mail button, put in `mount` (before what is there): it keeps its unread count and opens the mailbox. */
export function mailButton(mount: HTMLElement, host: MailHost): { refresh: () => void; remove: () => void } {
  const button = el('button', 'mail-button');
  button.type = 'button';
  button.innerHTML = ENVELOPE;
  button.setAttribute('aria-label', 'Mail');
  const badge = el('span', 'mail-badge');
  badge.hidden = true;
  button.append(badge);
  mount.prepend(button);

  const dialog = el('dialog', 'mailbox');
  dialog.setAttribute('aria-label', 'Mailbox');
  document.body.append(dialog);
  let view: MailboxView | null = null;
  let busy = false;
  let note = '';

  const query = (): string | null => {
    const server = host.server();
    return server ? `?guild=${encodeURIComponent(server)}` : null;
  };
  const showCount = (unread: number): void => {
    badge.hidden = unread <= 0;
    badge.textContent = unread > 99 ? '99+' : String(unread);
    button.setAttribute('aria-label', unread > 0 ? `Mail: ${unread} unread` : 'Mail');
  };

  async function refresh(): Promise<void> {
    const q = query();
    if (!q) return;
    const res = await host.api<MailboxView>(`/api/mail${q}`);
    if (!res.ok) return;
    view = res.data;
    showCount(view.unread);
    if (dialog.open) draw();
  }

  async function post<T extends MailboxView>(path: string, body: Record<string, unknown>): Promise<T | string> {
    const server = host.server();
    if (!server) return 'not_found';
    const res = await host.api<T>(path, { method: 'POST', body: JSON.stringify({ guild: server, ...body }) });
    return res.ok ? res.data : res.error;
  }

  async function claim(mail: MailView, pick: { hero?: string; skill?: number }): Promise<void> {
    if (busy) return;
    busy = true;
    note = '';
    draw();
    const done = await post<MailClaimed>('/api/mail/claim', { id: mail.id, ...pick });
    busy = false;
    if (typeof done === 'string') note = CLAIM_ERRORS[done] ?? 'Could not claim that. Try again.';
    else {
      view = done;
      showCount(done.unread);
      note = done.given.length > 0 ? `Claimed: ${done.given.join(', ')}.` : 'Claimed.';
      host.changed?.();
    }
    draw();
  }

  /** A mail's picker for its ticket: a hero, and (a unique treasure's) which of its four. */
  function picker(mail: MailView): { box: HTMLElement; pick: () => { hero?: string; skill?: number } } | null {
    const ticket = mail.attachments.find((one) => one.selector)?.selector;
    if (!ticket || !view) return null;
    const box = el('div', 'mail-pick');
    const hero = el('select');
    hero.setAttribute('aria-label', 'Hero');
    for (const one of view.heroes) {
      const option = el('option', '', one.name);
      option.value = one.id;
      hero.append(option);
    }
    box.append(hero);
    const skill = el('select');
    skill.setAttribute('aria-label', 'Unique treasure');
    const fill = (): void => {
      const treasures = view?.heroes.find((one) => one.id === hero.value)?.treasures ?? [];
      skill.replaceChildren(
        ...treasures.map((name, i) => {
          const option = el('option', '', `UT${i + 1}: ${name}`);
          option.value = String(i + 1);
          return option;
        }),
      );
    };
    if (ticket === 'ut') {
      fill();
      hero.addEventListener('change', fill);
      box.append(skill);
    }
    return { box, pick: () => ({ hero: hero.value, ...(ticket === 'ut' && { skill: Number(skill.value) }) }) };
  }

  function draw(): void {
    dialog.replaceChildren();
    const head = el('div', 'mailbox-head');
    head.append(el('h2', 'mailbox-title', 'Mailbox'));
    const close = el('button', 'mailbox-close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => dialog.close());
    head.append(close);
    dialog.append(head);
    if (note) dialog.append(el('p', 'mailbox-note', note));
    const list = el('ul', 'mailbox-list');
    for (const mail of view?.mail ?? []) {
      const item = el('li', `mail${mail.claimed ? ' claimed' : ''}${mail.read ? '' : ' unread'}`);
      const top = el('div', 'mail-top');
      top.append(el('strong', 'mail-title', mail.title), el('span', 'mail-from', `${mail.from === 'admin' ? 'From the admin' : 'Koma'} · ${new Date(mail.sent).toLocaleDateString()}`));
      item.append(top, el('p', 'mail-message', mail.message));
      if (mail.attachments.length > 0) {
        const things = el('ul', 'mail-attachments');
        for (const one of mail.attachments) {
          const row = el('li', 'mail-attachment');
          if (one.icon) {
            const icon = el('img');
            icon.src = `/kr/items/${one.icon}.webp`;
            icon.alt = '';
            row.append(icon);
          }
          row.append(el('span', '', one.text));
          things.append(row);
        }
        item.append(things);
        if (mail.claimed) item.append(el('p', 'mail-claimed', 'Claimed'));
        else {
          const chooser = picker(mail);
          if (chooser) item.append(chooser.box);
          const take = el('button', 'mail-claim action main', 'Claim');
          take.type = 'button';
          take.disabled = busy;
          take.addEventListener('click', () => void claim(mail, chooser?.pick() ?? {}));
          item.append(take);
        }
      }
      list.append(item);
    }
    if ((view?.mail.length ?? 0) === 0) list.append(el('li', 'mailbox-empty', 'No mail yet.'));
    dialog.append(list);
  }

  button.addEventListener('click', () => {
    note = '';
    draw();
    dialog.showModal();
    void (async () => {
      await refresh();
      // (Opened: all of it read.)
      if (view && view.unread > 0) {
        const read = await post<MailboxView>('/api/mail/read', { id: null });
        if (typeof read !== 'string') {
          view = read;
          showCount(read.unread);
          draw();
        }
      }
    })();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  void refresh();
  const timer = window.setInterval(() => void refresh(), 60_000);
  const onFocus = (): void => void refresh();
  window.addEventListener('focus', onFocus);
  return {
    refresh: () => void refresh(),
    remove: () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      button.remove();
      dialog.remove();
    },
  };
}

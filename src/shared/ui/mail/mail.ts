import './mail.css';
import type { MailAttachmentView, MailboxView, MailClaimed, MailView } from '../../../protocol/mail';
import { coin } from '../../util/coin';
import { uniquePicture as picture } from './pick';

/*
 * The mailbox, the Inbox in the profile's drop-down (../../../site/session.ts): how many mails wait (unread, or with rewards
 * unclaimed; none: no badge) is on the profile button while the drop-down is closed, and on the Inbox open. The Inbox opens
 * the mailbox: each mail (the newest first) with its message and what it carries, a line each, and
 * Claim for what it carries. A ticket (a Unique Weapon or Unique Treasure Ticket) claimed goes to the Inventory's Others
 * (../../../inventory/tabs/others.ts), picked there as it is used; one claimed back when it was picked as it was claimed
 * shows what it was picked as beside it. Opening it marks the mail read. The bot's GET /api/mail, POST /api/mail/read and
 * /claim (its services/mail.ts).
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

/** The bot's komaGems and komaTokens emoji (its constants/core.ts GEM_EMOJI, TOKEN_EMOJI), by their Discord ids. */
const EMOJI = { gems: '1551635240210927736', tokens: '1552921364489572362' } as const;

/** What a mail carries' picture: King's Raid's icon (a ticket, a rune), or a currency's emoji (zeiucoins: the site's coin). Null: none. */
function rewardPicture(one: MailAttachmentView): HTMLElement | null {
  if (one.currency === 'points') return coin('mail-reward-pic');
  const img = el('img', 'mail-reward-pic');
  img.alt = '';
  if (one.currency) img.src = `https://cdn.discordapp.com/emojis/${EMOJI[one.currency]}.webp?size=96`;
  else if (one.icon) img.src = `/kr/items/${one.icon}.webp`;
  else return null;
  return img;
}

/** What the bot answered a claim with that wasn't a claim, said for the member. */
const CLAIM_ERRORS: Record<string, string> = {
  claimed: 'Already claimed.',
  not_found: 'That mail is gone.',
};

/** Said on `window` once a claim gave tickets or Dispatch Battle Loot (they're in the Inventory's Others: ../../../inventory/page.ts asks again). */
export const TICKETS_CLAIMED = 'mail-tickets-claimed';

/** The mailbox's badges, for the profile button and the Inbox (each kept up to date), and what opens it. */
export interface Mailbox {
  badges: { profile: HTMLElement; item: HTMLElement };
  open: () => void;
  refresh: () => void;
  remove: () => void;
}

/** The mailbox: it keeps its count of mail waiting on its badges, and opens (`open`, the Inbox). */
export function mailbox(host: MailHost): Mailbox {
  const badge = (): HTMLElement => {
    const one = el('span', 'mail-badge account-badge');
    one.hidden = true;
    return one;
  };
  const badges = { profile: badge(), item: badge() };

  const dialog = el('dialog', 'mailbox');
  dialog.setAttribute('aria-label', 'Mailbox');
  document.body.append(dialog);
  let view: MailboxView | null = null;
  let busy = false;
  let note = '';
  /** How many tickets the last claim gave, and Dispatch Battle Loot (a background raid's): the note links to the Inventory's Others, where they are. */
  let tickets = 0;
  let boxes = 0;

  const query = (): string | null => {
    const server = host.server();
    return server ? `?guild=${encodeURIComponent(server)}` : null;
  };
  const showCount = (unread: number): void => {
    for (const one of [badges.profile, badges.item]) {
      one.hidden = unread <= 0;
      one.textContent = unread > 99 ? '99+' : String(unread);
      one.title = `${unread} mail waiting`;
    }
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

  async function claim(mail: MailView): Promise<void> {
    if (busy) return;
    note = '';
    tickets = 0;
    boxes = 0;
    busy = true;
    draw();
    const done = await post<MailClaimed>('/api/mail/claim', { id: mail.id });
    busy = false;
    if (typeof done === 'string') note = CLAIM_ERRORS[done] ?? 'Could not claim that. Try again.';
    else {
      view = done;
      showCount(done.unread);
      note = done.given.length > 0 ? `Claimed: ${done.given.join(', ')}.` : 'Claimed.';
      tickets = mail.attachments.filter((one) => one.selector).length;
      boxes = mail.attachments.filter((one) => one.box).length;
      host.changed?.();
      // (The inventory, open behind it: its tickets and boxes asked for again.)
      if (tickets > 0 || boxes > 0) window.dispatchEvent(new Event(TICKETS_CLAIMED));
    }
    draw();
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
    if (note) {
      const line = el('p', 'mailbox-note', note);
      if (tickets > 0 || boxes > 0) {
        const link = el('a', '', 'Others');
        link.href = '/inventory/others/';
        link.addEventListener('click', () => dialog.close());
        line.append(` ${boxes > 0 ? 'Open' : 'Use'} ${tickets + boxes === 1 && !boxes ? 'it' : 'them'} in your Inventory’s `, link, ' tab.');
      }
      dialog.append(line);
    }
    const list = el('ul', 'mailbox-list');
    for (const mail of view?.mail ?? []) {
      const item = el('li', `mail${mail.claimed ? ' claimed' : ''}${mail.read ? '' : ' unread'}`);
      const top = el('div', 'mail-top');
      top.append(el('strong', 'mail-title', mail.title), el('span', 'mail-from', `${mail.from === 'admin' ? 'From the admin' : 'Koma'} · ${new Date(mail.sent).toLocaleDateString()}`));
      const message = el('p', 'mail-message');
      message.append(el('strong', 'mail-message-label', 'Message:'), ` ${mail.message}`);
      item.append(top, message);
      if (mail.attachments.length > 0) {
        const things = el('ul', 'mail-attachments');
        // A tile each, in a row: its picture over what it is.
        for (const one of mail.attachments) {
          const tile = el('li', 'mail-attachment');
          const pictures = el('div', 'mail-attachment-pics');
          const art = rewardPicture(one);
          if (art) pictures.append(art);
          // A ticket claimed back when it was picked as it was claimed: what it was picked as, to its right, its name under it.
          const picked = one.picked;
          if (picked) pictures.append(el('span', 'mail-picked-arrow', '→'), picture(picked, 'mail-picked-pic'));
          tile.append(pictures, el('span', 'mail-attachment-text', one.text));
          if (picked) tile.append(el('span', 'mail-picked-name', picked.name));
          things.append(tile);
        }
        item.append(things);
        if (mail.claimed) item.append(el('p', 'mail-claimed', 'Claimed'));
        else {
          const take = el('button', 'mail-claim action main', 'Claim');
          take.type = 'button';
          take.disabled = busy;
          take.addEventListener('click', () => void claim(mail));
          item.append(take);
        }
      }
      list.append(item);
    }
    if ((view?.mail.length ?? 0) === 0) list.append(el('li', 'mailbox-empty', 'No mail yet.'));
    dialog.append(list);
  }

  const open = (): void => {
    note = '';
    draw();
    dialog.showModal();
    void (async () => {
      await refresh();
      // (Opened: all of it read.)
      if (view?.mail.some((mail) => !mail.read)) {
        const read = await post<MailboxView>('/api/mail/read', { id: null });
        if (typeof read !== 'string') {
          view = read;
          showCount(read.unread);
          draw();
        }
      }
    })();
  };
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  void refresh();
  const timer = window.setInterval(() => void refresh(), 60_000);
  const onFocus = (): void => void refresh();
  window.addEventListener('focus', onFocus);
  return {
    badges,
    open,
    refresh: () => void refresh(),
    remove: () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      badges.profile.remove();
      badges.item.remove();
      dialog.remove();
    },
  };
}

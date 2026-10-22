import './mail.css';
import type { MailAttachmentView, MailboxView, MailClaimed, MailPickItem, MailView } from '../../../protocol/mail';
import { coin } from '../../util/coin';
import { loadUniqueSheet, pickUnique, uniqueEntries, uniquePicture as picture, type UniqueSheet } from './pick';

/*
 * The mailbox, the Inbox in the profile's drop-down (../../../site/session.ts): how many mails wait (unread, or with rewards
 * unclaimed; none: no badge) is on the profile button while the drop-down is closed, and on the Inbox open. The Inbox opens
 * the mailbox: each mail (the newest first) with its message and what it carries, a line each, and
 * Claim for what it carries. A mail with tickets (a Unique Weapon or Unique Treasure Ticket) has each picked in a popup of
 * its own once Claim is pressed, the weapons' first, as King's Raid's ticket has it: every item it can be on the left, the
 * one picked's main stat and unique effect on the right; what each was picked as shows beside it. Opening it marks the mail read. The bot's GET /api/mail, POST /api/mail/read and /claim (its
 * services/mail.ts).
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

/** A ticket's kind, as its popup says it. */
const TICKET = { uw: 'Unique Weapon', ut: 'Unique Treasure' } as const;

/** A pick of a ticket: its hero (a unique treasure's, which of its four), and the item that is. */
interface Picked {
  hero: string;
  skill?: number;
  item: MailPickItem;
}

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
  needs_pick: 'Pick what you want first.',
  bad_pick: 'Pick a hero (and a unique treasure) first.',
  not_found: 'That mail is gone.',
};

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
  /** A mail's tickets picked so far, being claimed (by its id; each by its attachment's index). */
  const picking = new Map<string, Map<number, MailPickItem>>();
  /** What a ticket's popup needs (the heroes and their items, the hero helpers): asked for once, with the first Claim of one. */
  const loadTickets = (): Promise<UniqueSheet | null> => {
    const server = host.server();
    return server ? loadUniqueSheet(host.api, server) : Promise.resolve(null);
  };

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
    // Its tickets first, a popup each (the weapons', then the treasures'): cancelling one leaves it unclaimed.
    const tickets = mail.attachments.flatMap((one, index) => (one.selector ? [{ of: one.selector, index }] : []));
    const order = [...tickets.filter((one) => one.of === 'uw'), ...tickets.filter((one) => one.of === 'ut')];
    const sheet = order.length > 0 ? await loadTickets() : null;
    if (order.length > 0 && !sheet) {
      note = 'Could not open the tickets. Try again.';
      draw();
      return;
    }
    const picks = new Map<number, Picked>();
    const shown = new Map<number, MailPickItem>();
    picking.set(mail.id, shown);
    let hero: string | undefined;
    for (const [n, ticket] of order.entries()) {
      const pick = sheet && (await choose(sheet, ticket.of, order.length > 1 ? `${n + 1} of ${order.length}` : '', hero));
      if (!pick) {
        picking.delete(mail.id);
        draw();
        return;
      }
      hero = pick.hero;
      picks.set(ticket.index, pick);
      shown.set(ticket.index, pick.item);
      draw();
    }
    busy = true;
    draw();
    const body = picks.size > 0 ? { picks: tickets.map((one) => ({ hero: picks.get(one.index)?.hero, skill: picks.get(one.index)?.skill })) } : {};
    const done = await post<MailClaimed>('/api/mail/claim', { id: mail.id, ...body });
    busy = false;
    picking.delete(mail.id);
    if (typeof done === 'string') note = CLAIM_ERRORS[done] ?? 'Could not claim that. Try again.';
    else {
      view = done;
      showCount(done.unread);
      note = done.given.length > 0 ? `Claimed: ${done.given.join(', ')}.` : 'Claimed.';
      host.changed?.();
    }
    draw();
  }

  /** A ticket's popup (./pick.ts): its kind's items, `hero`'s first (the one picked before). The pick, or null if it was closed. */
  async function choose(sheet: UniqueSheet, of: 'uw' | 'ut', step: string, hero?: string): Promise<Picked | null> {
    const entries = uniqueEntries(sheet, of);
    const picked = await pickUnique(sheet, entries, { title: `${TICKET[of]} Ticket`, step, chosen: entries.find((one) => one.hero.id === hero) ?? entries[0] });
    return picked && picked !== 'none' ? { hero: picked.hero.id, ...(picked.skill && { skill: picked.skill }), item: picked.item } : null;
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
      const message = el('p', 'mail-message');
      message.append(el('strong', 'mail-message-label', 'Message:'), ` ${mail.message}`);
      item.append(top, message);
      if (mail.attachments.length > 0) {
        const things = el('ul', 'mail-attachments');
        // A tile each, in a row: its picture over what it is.
        for (const [index, one] of mail.attachments.entries()) {
          const tile = el('li', 'mail-attachment');
          const pictures = el('div', 'mail-attachment-pics');
          const art = rewardPicture(one);
          if (art) pictures.append(art);
          // A ticket's pick, to its right (claimed, or picked in its popup just now), and its name under it.
          const picked = one.picked ?? picking.get(mail.id)?.get(index);
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
          take.disabled = busy || picking.has(mail.id);
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

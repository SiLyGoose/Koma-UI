import './mail.css';
import type { MailAttachmentView, MailboxView, MailClaimed, MailHero, MailPickItem, MailTicketItem, MailTickets, MailView } from '../../../protocol/mail';
import { coin } from '../../util/coin';

/*
 * The mailbox, in the site header: a mail icon beside the profile button, with how many mails wait on it (unread, or with
 * rewards unclaimed; none: no badge). Pressing it opens the mailbox: each mail (the newest first) with its message and what it carries, a line each, and
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

/** The shared hero helpers (their faces, King's Raid's skill words): fetched with a ticket's popup, not with every page. */
type HeroHelpers = typeof import('../../heroes');

/** One of the items in a ticket's popup: its hero, which of its unique treasures (UT1 to UT4; none for a weapon), and the item. */
interface Entry {
  hero: MailHero;
  skill?: number;
  item: MailTicketItem;
}

/** A pick of a ticket: its hero (a unique treasure's, which of its four), and the item that is. */
interface Picked {
  hero: string;
  skill?: number;
  item: MailPickItem;
}

/** Where the item pictures are (../../built.ts): fetched when the mailbox first opens, not with every page. */
let pictures: Promise<typeof import('../../built')> | null = null;

/** An item's picture (a unique weapon's or treasure's), in a box of `className`; empty until the pictures' list is in. */
function picture(item: MailPickItem, className: string, lazy = false): HTMLElement {
  const box = el('span', className);
  void (pictures ??= import('../../built')).then(({ built, hasItemArt }) => {
    const folder = hasItemArt('weapons', item.itemId) ? 'weapons' : hasItemArt('treasures', item.itemId) ? 'treasures' : null;
    if (!folder) return;
    const img = el('img');
    img.alt = '';
    img.decoding = 'async';
    if (lazy) img.loading = 'lazy';
    img.src = built(`/gear/items/${folder}/${item.itemId}.png`);
    box.append(img);
  });
  return box;
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

const ENVELOPE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2.4V17h16V7.4l-8 5.3-8-5.3ZM5.2 7 12 11.5 18.8 7H5.2Z"/></svg>';

/** What the bot answered a claim with that wasn't a claim, said for the member. */
const CLAIM_ERRORS: Record<string, string> = {
  claimed: 'Already claimed.',
  needs_pick: 'Pick what you want first.',
  bad_pick: 'Pick a hero (and a unique treasure) first.',
  not_found: 'That mail is gone.',
};

/** The mail button, put in `mount` (before what is there): it keeps its count of mail waiting and opens the mailbox. */
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
  /** A mail's tickets picked so far, being claimed (by its id; each by its attachment's index). */
  const picking = new Map<string, Map<number, MailPickItem>>();
  /** What a ticket's popup needs (the heroes and their items, the hero helpers): asked for once, with the first Claim of one. */
  let ticketing: Promise<{ heroes: MailHero[]; helpers: HeroHelpers } | null> | null = null;
  const loadTickets = (): Promise<{ heroes: MailHero[]; helpers: HeroHelpers } | null> =>
    (ticketing ??= (async () => {
      const q = query();
      const [res, helpers] = await Promise.all([q ? host.api<MailTickets>(`/api/mail/tickets${q}`) : null, import('../../heroes')]);
      if (!res?.ok) {
        ticketing = null;
        return null;
      }
      return { heroes: res.data.heroes, helpers };
    })());

  const query = (): string | null => {
    const server = host.server();
    return server ? `?guild=${encodeURIComponent(server)}` : null;
  };
  const showCount = (unread: number): void => {
    badge.hidden = unread <= 0;
    badge.textContent = unread > 99 ? '99+' : String(unread);
    button.setAttribute('aria-label', unread > 0 ? `Mail: ${unread} waiting` : 'Mail');
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

  /**
   * A ticket's popup, over the mailbox, as King's Raid's ticket: every item it can be on the left (an icon and a name each, a
   * search over them), the one picked on the right (its picture and name, its hero, a new copy's main stat, its unique
   * effect), and Confirm. `hero`: the one picked before (its first item picked at first). `step`: which popup of how many
   * ("1 of 2"). The pick, or null if it was closed.
   */
  function choose(sheet: { heroes: MailHero[]; helpers: HeroHelpers }, of: 'uw' | 'ut', step: string, hero?: string): Promise<Picked | null> {
    const { helpers } = sheet;
    const entries: Entry[] = sheet.heroes.flatMap((one) =>
      of === 'uw' ? (one.weapon ? [{ hero: one, item: one.weapon }] : []) : one.treasures.map((item, i) => ({ hero: one, skill: i + 1, item })),
    );
    const popup = el('dialog', 'mail-popup');
    popup.setAttribute('aria-label', `${TICKET[of]} Ticket`);
    const head = el('div', 'mail-popup-head');
    head.append(el('h3', 'mail-popup-title', `${TICKET[of]} Ticket`));
    if (step) head.append(el('span', 'mail-popup-step', step));
    const close = el('button', 'mail-popup-close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    head.append(close);

    // The left: every item, a row each.
    const side = el('div', 'mail-popup-side');
    // (The armory's search field.)
    const search = el('input', 'armory-search mail-popup-search');
    search.type = 'search';
    search.autocomplete = 'off';
    search.placeholder = 'Search heroes or items';
    search.setAttribute('aria-label', 'Search heroes or items');
    const list = el('ul', 'mail-popup-list');
    side.append(search, list);
    // The right: the one picked.
    const detail = el('div', 'mail-popup-detail');
    const confirm = el('button', 'mail-popup-confirm action main', 'Confirm');
    confirm.type = 'button';

    let chosen = entries.find((one) => one.hero.id === hero) ?? entries[0];
    const rows = new Map<Entry, HTMLButtonElement>();
    const show = (): void => {
      for (const [entry, row] of rows) {
        row.classList.toggle('on', entry === chosen);
        row.setAttribute('aria-pressed', String(entry === chosen));
      }
      confirm.disabled = !chosen;
      if (!chosen) return void detail.replaceChildren();
      const { item, hero: owner } = chosen;
      const top = el('div', 'mail-detail-top');
      top.append(picture(item, 'mail-detail-pic'), el('strong', 'mail-detail-name', item.name));
      const limit = el('div', 'mail-detail-limit');
      const face = el('span', 'mail-detail-face');
      void helpers.heroCut(owner.id, helpers.TAB_FACE, 96).then((src) => {
        if (!src) return;
        const img = el('img');
        img.alt = '';
        img.src = src;
        face.append(img);
      });
      limit.append(el('span', 'mail-detail-label', 'Class Limit'), face, el('span', 'mail-detail-hero', chosen.skill ? `${owner.name} · UT${chosen.skill}` : owner.name));
      const body = el('div', 'mail-detail-body');
      if (item.main) {
        const main = el('div', 'mail-detail-main');
        main.append(el('span', '', item.main.name), el('span', '', `+${item.main.value.toLocaleString()}`));
        body.append(main);
      }
      if (item.effect) {
        const effect = el('p', 'mail-detail-effect');
        effect.append(...helpers.skillText(item.effect));
        body.append(el('h4', 'mail-detail-heading', 'Unique Option'), effect);
      }
      detail.replaceChildren(top, limit, body, confirm);
    };
    for (const entry of entries) {
      const row = el('button', 'mail-option');
      row.type = 'button';
      const words = el('span', 'mail-option-words');
      words.append(el('span', 'mail-option-name', entry.item.name), el('span', 'mail-option-hero', entry.skill ? `${entry.hero.name} · UT${entry.skill}` : entry.hero.name));
      row.append(picture(entry.item, 'mail-option-pic', true), words);
      row.addEventListener('click', () => {
        chosen = entry;
        show();
      });
      rows.set(entry, row);
      const li = el('li');
      li.append(row);
      list.append(li);
    }
    search.addEventListener('input', () => {
      const words = search.value.trim().toLowerCase();
      for (const [entry, row] of rows) {
        const li = row.parentElement;
        if (li) li.hidden = words !== '' && !`${entry.item.name} ${entry.hero.name}`.toLowerCase().includes(words);
      }
    });
    show();

    const body = el('div', 'mail-popup-body');
    body.append(side, detail);
    popup.append(head, body);
    document.body.append(popup);
    popup.showModal();
    // (The one picked at first in sight, not the search: on a phone, focusing it would pull its keyboard up.)
    if (chosen) rows.get(chosen)?.scrollIntoView({ block: 'center' });
    // (Without scrolling the one picked's side down to it.)
    confirm.focus({ preventScroll: true });
    return new Promise((resolve) => {
      let picked: Picked | null = null;
      close.addEventListener('click', () => popup.close());
      confirm.addEventListener('click', () => {
        if (!chosen) return;
        picked = { hero: chosen.hero.id, ...(chosen.skill && { skill: chosen.skill }), item: chosen.item };
        popup.close();
      });
      popup.addEventListener('click', (event) => {
        if (event.target === popup) popup.close();
      });
      // (Closed any way, Escape too: cancelled, unless confirmed.)
      popup.addEventListener('close', () => {
        popup.remove();
        resolve(picked);
      });
    });
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

  button.addEventListener('click', () => {
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

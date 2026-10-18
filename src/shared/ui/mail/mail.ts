import './mail.css';
import type { MailboxView, MailClaimed, MailHero, MailPickItem, MailView } from '../../../protocol/mail';

/*
 * The mailbox, in the site header: a mail icon beside the profile button, with how many mails are unread on it (none: no
 * badge). Pressing it opens the mailbox: each mail (the newest first) with its message and what it carries, a line each, and
 * Claim for what it carries. A mail with tickets (a Unique Weapon or Unique Treasure Ticket) has each picked in a popup of
 * its own once Claim is pressed, the weapons' first: its hero (and a unique treasure, which of its four); what each was
 * picked as shows beside it. Opening it marks the mail read. The bot's GET /api/mail, POST /api/mail/read and /claim (its
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

/** Where the item pictures are (../../built.ts): fetched when the mailbox first opens, not with every page. */
let pictures: Promise<typeof import('../../built')> | null = null;

/** An item's picture (a unique weapon's or treasure's), in a box of `className`; empty until the pictures' list is in. */
function picture(item: MailPickItem, className: string): HTMLElement {
  const box = el('span', className);
  void (pictures ??= import('../../built')).then(({ built, hasItemArt }) => {
    const folder = hasItemArt('weapons', item.itemId) ? 'weapons' : hasItemArt('treasures', item.itemId) ? 'treasures' : null;
    if (!folder) return;
    const img = el('img');
    img.alt = '';
    img.decoding = 'async';
    img.src = built(`/gear/items/${folder}/${item.itemId}.png`);
    box.append(img);
  });
  return box;
}

/** What a ticket was picked as, beside it: an arrow, and its item's picture and name. */
function pickedBeside(item: MailPickItem): HTMLElement {
  const box = el('span', 'mail-picked');
  box.append(el('span', 'mail-picked-arrow', '→'), picture(item, 'mail-picked-pic'), el('span', 'mail-picked-name', item.name));
  return box;
}

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
  /** A mail's tickets picked so far, being claimed (by its id; each by its attachment's index). */
  const picking = new Map<string, Map<number, MailPickItem>>();

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

  async function claim(mail: MailView): Promise<void> {
    if (busy) return;
    note = '';
    // Its tickets first, a popup each (the weapons', then the treasures'): cancelling one leaves it unclaimed.
    const tickets = mail.attachments.flatMap((one, index) => (one.selector ? [{ of: one.selector, index }] : []));
    const order = [...tickets.filter((one) => one.of === 'uw'), ...tickets.filter((one) => one.of === 'ut')];
    const picks = new Map<number, Picked>();
    const shown = new Map<number, MailPickItem>();
    picking.set(mail.id, shown);
    let hero: string | undefined;
    for (const [n, ticket] of order.entries()) {
      const pick = await choose(ticket.of, order.length > 1 ? `${n + 1} of ${order.length}` : '', hero);
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
   * A ticket's popup, over the mailbox: its hero (`hero` at first: the one picked before), and its item (a unique weapon:
   * the hero's; a unique treasure: which of its four). `step`: which popup of how many ("1 of 2"). The pick, or null if it
   * was cancelled.
   */
  function choose(of: 'uw' | 'ut', step: string, hero?: string): Promise<Picked | null> {
    const heroes = (view?.heroes ?? []).filter((one) => (of === 'uw' ? one.weapon : one.treasures.length > 0));
    const popup = el('dialog', 'mail-popup');
    popup.setAttribute('aria-label', `Pick a ${TICKET[of]}`);
    const head = el('div', 'mail-popup-head');
    head.append(el('h3', 'mail-popup-title', `${TICKET[of]} Ticket`));
    if (step) head.append(el('span', 'mail-popup-step', step));
    const hint = el('p', 'mail-popup-hint', of === 'uw' ? 'Pick a hero: their unique weapon is yours.' : 'Pick a hero, then which of their unique treasures.');
    const who = el('select', 'mail-popup-hero');
    who.setAttribute('aria-label', 'Hero');
    for (const one of heroes) {
      const option = el('option', '', one.name);
      option.value = one.id;
      who.append(option);
    }
    if (hero && heroes.some((one) => one.id === hero)) who.value = hero;
    const items = el('div', `mail-popup-items ${of}`);
    let skill = 1;
    const heroOf = (): MailHero | undefined => heroes.find((one) => one.id === who.value);
    const fill = (): void => {
      const one = heroOf();
      if (of === 'uw') {
        const weapon = one?.weapon;
        items.replaceChildren(...(weapon ? [card(weapon, '')] : []));
        return;
      }
      skill = 1;
      items.replaceChildren(
        ...(one?.treasures ?? []).map((treasure, i) => {
          const choice = card(treasure, `UT${i + 1}`, i === 0);
          choice.addEventListener('click', () => {
            skill = i + 1;
            for (const other of items.children) other.classList.toggle('on', other === choice);
            for (const other of items.children) other.setAttribute('aria-pressed', String(other === choice));
          });
          return choice;
        }),
      );
    };
    const card = (item: MailPickItem, label: string, on = true): HTMLElement => {
      const choice = el(of === 'ut' ? 'button' : 'div', `mail-choice${on ? ' on' : ''}`);
      if (choice instanceof HTMLButtonElement) {
        choice.type = 'button';
        choice.setAttribute('aria-pressed', String(on));
      }
      choice.append(picture(item, 'mail-choice-pic'));
      if (label) choice.append(el('span', 'mail-choice-label', label));
      choice.append(el('span', 'mail-choice-name', item.name));
      return choice;
    };
    fill();
    who.addEventListener('change', fill);
    const buttons = el('div', 'mail-popup-buttons');
    const cancel = el('button', 'mail-popup-cancel action', 'Cancel');
    cancel.type = 'button';
    const confirm = el('button', 'mail-popup-confirm action main', 'Confirm');
    confirm.type = 'button';
    confirm.disabled = heroes.length === 0;
    buttons.append(cancel, confirm);
    popup.append(head, hint, who, items, buttons);
    document.body.append(popup);
    popup.showModal();
    return new Promise((resolve) => {
      let picked: Picked | null = null;
      cancel.addEventListener('click', () => popup.close());
      confirm.addEventListener('click', () => {
        const one = heroOf();
        const item = of === 'uw' ? one?.weapon : one?.treasures[skill - 1];
        if (!one || !item) return;
        picked = { hero: one.id, ...(of === 'ut' && { skill }), item };
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
      item.append(top, el('p', 'mail-message', mail.message));
      if (mail.attachments.length > 0) {
        const things = el('ul', 'mail-attachments');
        for (const [index, one] of mail.attachments.entries()) {
          const row = el('li', 'mail-attachment');
          if (one.icon) {
            const icon = el('img');
            icon.src = `/kr/items/${one.icon}.webp`;
            icon.alt = '';
            row.append(icon);
          }
          row.append(el('span', '', one.text));
          // A ticket's pick, beside it (claimed, or picked in its popup just now).
          const picked = one.picked ?? picking.get(mail.id)?.get(index);
          if (picked) row.append(pickedBeside(picked));
          things.append(row);
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

import { el } from '../../shared/items';
import { loadUniqueSheet, pickUnique, uniqueEntries } from '../../shared/ui/mail/pick';
import { api } from '../../site/session';
import type { RaidShopUsed, RaidShopView } from '../../protocol/raid-shop';
import type { InventoryHost } from '../tab';

/*
 * The Unique Weapon and Unique Treasure Tickets crafted from komaDust (./craft.ts) or claimed from mail, held in Others
 * (./others.ts) until used: Use opens the ticket popup (../../shared/ui/mail/pick.ts: every hero's item of the ticket's
 * kind), and the one confirmed is theirs (the bot's POST /api/raid-shop/use, a new copy of it), the ticket spent.
 */

export type TicketKind = 'uw' | 'ut';

export const TICKET_NAME: Readonly<Record<TicketKind, string>> = { uw: 'Unique Weapon', ut: 'Unique Treasure' };

/** A ticket's picture (King's Raid's, as the mailbox's). */
export function ticketPicture(of: TicketKind): HTMLImageElement {
  const img = el('img');
  img.src = `/kr/items/${of === 'uw' ? 'WEAPON' : 'TREASURE'}_UNIQUE_SELECT_ITEM.webp`;
  img.alt = '';
  img.draggable = false;
  return img;
}

/**
 * Uses one of their tickets of kind `of`: its popup, then the bot (`button` saying it is working meanwhile). The shop as it
 * is after (their tickets one fewer), or null: closed, or it didn't work (said so in the status line).
 */
export async function useTicket(host: InventoryHost, of: TicketKind, button: HTMLButtonElement): Promise<RaidShopView | null> {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = 'Opening…';
  const sheet = await loadUniqueSheet(api, host.server());
  button.textContent = label;
  if (!sheet) {
    button.disabled = false;
    host.status('Could not load the heroes’ items. Try again.', true);
    return null;
  }
  const entries = uniqueEntries(sheet, of);
  const picked = await pickUnique(sheet, entries, { title: `${TICKET_NAME[of]} Ticket`, note: `Pick the ${TICKET_NAME[of].toLowerCase()} this ticket gives you.` });
  if (!picked || picked === 'none') {
    button.disabled = false;
    return null;
  }
  button.textContent = 'Using…';
  host.status(null);
  const res = await api<RaidShopUsed>('/api/raid-shop/use', {
    method: 'POST',
    body: JSON.stringify({ guild: host.server(), of, hero: picked.hero.id, ...(picked.skill && { skill: picked.skill }) }),
  });
  button.textContent = label;
  button.disabled = false;
  if (!res.ok) {
    if (res.error === 'not_owned') {
      host.status(`You don’t have a ${TICKET_NAME[of]} Ticket any more.`, true);
      const fresh = await host.load('shop', true);
      return fresh.ok ? fresh.data : null;
    }
    host.failed(res, 'Could not use the ticket. Try again.');
    return null;
  }
  const { given, ...shop } = res.data;
  host.keep('shop', shop);
  // (The new copy: the gear tabs' and the heroes page's answers say it, so they're asked for again.)
  void host.load('gear', true);
  void host.load('heroes', true);
  host.status(`You got ${given}.`);
  return shop;
}

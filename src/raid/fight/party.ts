import { el } from '../widgets';
import type { RaidView } from '../protocol';
import { redraw } from '../render';
import { ui } from '../ui';
import { memberItem } from './member';

/** How many raiders the party row shows at once; with more, a button swaps between them (in the order they joined). */
const PARTY_PAGE = 4;
/** Which of those pages the party row shows. */
let partyPage = 0;
/**
 * The party row's lasting parts: the swap button (with more raiders than fit) and a layer for each four
 * of them, stacked. They stay from one drawing to the next, so a layer glides between front and back.
 */
const swapSlot = el('li', 'rd-swap-slot');
const swapButton = el('button', 'rd-swap');
const swapPage = el('span', 'rd-swap-page');
const partyStack = el('li', 'rd-party-stack');
const partyLayers: HTMLUListElement[] = [];
swapButton.type = 'button';
swapButton.title = 'Show the other raiders';
// A camera with three arrows round it (drawn here, like a game's switch-view button).
swapButton.innerHTML = '<svg class="rd-swap-icon" viewBox="0 0 64 64" aria-hidden="true" fill="currentColor"><path d="M40.6 8.5A25 25 0 0 1 56.6 36.3" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M55.8 41.3L54.7 31.2L60.2 32.1Z"/><path d="M48.1 51.2A25 25 0 0 1 15.9 51.2" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M12.1 47.9L21.3 52.1L17.8 56.3Z"/><path d="M7.4 36.3A25 25 0 0 1 23.4 8.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M28.1 6.8L19.9 12.7L18.0 7.6Z"/><path d="M21 25h5l2.5-3.5h7L38 25h5a2.5 2.5 0 0 1 2.5 2.5v11A2.5 2.5 0 0 1 43 41H21a2.5 2.5 0 0 1-2.5-2.5v-11A2.5 2.5 0 0 1 21 25Z"/><circle cx="32" cy="33" r="5.2" fill="#151823"/><circle cx="32" cy="33" r="3" /></svg>';
swapButton.addEventListener('click', () => {
  partyPage++;
  redraw();
});
swapSlot.append(swapButton, swapPage);

/**
 * The party row. More raiders than fit show four at a time, in the order they joined: the four in front,
 * the next four behind them (up and to the left, faded), and a button on the left swapping them round.
 */
export function renderParty(v: RaidView): void {
  const f = v.fight!;
  const pages = Math.ceil(f.players.length / PARTY_PAGE);
  partyPage = pages > 1 ? partyPage % pages : 0;
  if (!partyStack.isConnected) ui.party.replaceChildren(swapSlot, partyStack);
  swapSlot.hidden = pages < 2;
  ui.party.classList.toggle('stacked', pages > 1);
  swapButton.setAttribute('aria-label', `Show the other raiders (${partyPage + 1} of ${pages})`);
  swapPage.textContent = `${partyPage + 1}/${pages}`;
  while (partyLayers.length < pages) {
    const layer = el('ul', 'rd-party-layer');
    partyLayers.push(layer);
    partyStack.append(layer);
  }
  partyLayers.forEach((layer, page) => {
    // The layer stays (so it glides when it moves front or back); what's in it is drawn afresh.
    const role = page === partyPage ? 'front' : pages > 1 && page === (partyPage + 1) % pages ? 'back' : 'off';
    layer.className = `rd-party-layer ${role}`;
    layer.inert = role !== 'front';
    layer.replaceChildren(...f.players.slice(page * PARTY_PAGE, (page + 1) * PARTY_PAGE).map((p) => memberItem(p, f, v, role === 'front')));
  });
}

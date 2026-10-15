import { el } from '../shared/items';
import { HEROES } from '../technomagic/sim/heroes';
import type { DatabankContext } from './context';
import { EMBLEM_RINGS } from './emblems';

/*
 * The databank's way in: what there is to look up, each a mark on the star chart with its name and how
 * many there are (of the items, how many they own in the server picked, when logged in). A mark opens
 * its section (./page.ts).
 */

/**
 * A mark: its emblem (./emblems.ts's rings, and over them its own picture, which ./styles/hub.css picks
 * by `kind`), its name, and its count (`says` reads it out in full).
 */
function node(kind: string, href: string, name: string, count: string, says: string): HTMLAnchorElement {
  const link = el('a', `db-node db-node-${kind}`);
  link.href = href;
  link.setAttribute('aria-label', `${name}: ${says}`);
  const mark = el('span', 'db-emblem');
  mark.innerHTML = EMBLEM_RINGS;
  mark.append(el('span', 'db-emblem-art'));
  link.append(mark, el('span', 'db-node-name', name), el('span', 'db-node-count', count));
  return link;
}

export function renderHub(ctx: DatabankContext): void {
  const { ui, databank, owned } = ctx;
  if (!databank) return;
  const total = databank.items.length;
  const mine = owned ? databank.items.filter((item) => owned.has(item.id)).length : null;
  const bosses = databank.bosses?.length ?? 0;
  const classes = databank.classes?.length ?? 0;
  ui.nodes.replaceChildren(
    node('items', '/databank/items/', 'Items', mine === null ? String(total) : `${mine}/${total}`, mine === null ? `${total} items` : `you own ${mine} of ${total}`),
    // A bot from before the databank had them sends none (of the classes, neither).
    ...(bosses > 0 ? [node('bosses', '/databank/bosses/', 'Raid Bosses', String(bosses), `${bosses} raid ${bosses === 1 ? 'boss' : 'bosses'}`)] : []),
    ...(classes > 0 ? [node('classes', '/databank/classes/', 'Classes', String(classes), `${classes} raid ${classes === 1 ? 'class' : 'classes'}`)] : []),
    node('heroes', '/databank/heroes/', 'Heroes', String(HEROES.length), `${HEROES.length} ${HEROES.length === 1 ? 'hero' : 'heroes'}`),
  );
}

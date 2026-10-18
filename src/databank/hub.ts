import { el } from '../shared/items';
import { HEROES } from '../technomagic/sim/heroes';
import { BOSSES } from '../technomagic/sim/bosses';
import { itemsOfKind, type DatabankContext, type ItemKind } from './context';
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

/** The items of a kind: how many, and (logged in) how many of them they own, as a mark's count and its words. */
function counted(ctx: DatabankContext, kinds: readonly ItemKind[]): { count: string; says: string } {
  const items = kinds.flatMap((kind) => itemsOfKind(ctx, kind));
  const mine = ctx.owned ? items.filter((item) => ctx.owned?.has(item.id)).length : null;
  return { count: mine === null ? String(items.length) : `${mine}/${items.length}`, says: mine === null ? `${items.length} items` : `you own ${mine} of ${items.length}` };
}

export function renderHub(ctx: DatabankContext): void {
  const { ui, databank } = ctx;
  if (!databank) return;
  const items = counted(ctx, ['hero', 'player']);
  // The enemies: the Weekly Bosses (a bot from before the databank had them sends none), and the raids' bosses.
  const enemies = (databank.bosses?.length ?? 0) + BOSSES.length;
  const classes = databank.classes?.length ?? 0;
  ui.nodes.replaceChildren(
    node('items', '/databank/items/', 'Items', items.count, items.says),
    node('bosses', '/databank/enemies/', 'Enemies', String(enemies), `${enemies} ${enemies === 1 ? 'enemy' : 'enemies'}`),
    ...(classes > 0 ? [node('classes', '/databank/classes/', 'Classes', String(classes), `${classes} raid ${classes === 1 ? 'class' : 'classes'}`)] : []),
    node('heroes', '/databank/heroes/', 'Heroes', String(HEROES.length), `${HEROES.length} ${HEROES.length === 1 ? 'hero' : 'heroes'}`),
  );
}

/** The items' way in: hero items and player items, side by side, each a mark as the way in's are (the items' picture, for now, on both). */
export function renderItemKinds(ctx: DatabankContext): void {
  if (!ctx.databank) return;
  const hero = counted(ctx, ['hero']);
  const player = counted(ctx, ['player']);
  ctx.ui.nodes.replaceChildren(
    node('items', '/databank/items/hero/', 'Hero Items', hero.count, hero.says),
    node('items', '/databank/items/player/', 'Player Items', player.count, player.says),
  );
}

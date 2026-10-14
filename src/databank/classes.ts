import { el, rich } from '../shared/items';
import { itemCard, label, lines } from './bosses';
import { classById, type DatabankContext } from './context';
import type { DatabankItem, RaidClass } from './types';

/*
 * The raid classes: a card for each down the side, and the one picked beside them on parchment: its
 * badge, what it does in a raid (the bot's lines: only what isn't as for a raider without a class), and
 * its class items, whose effects only work for that class, with what each does fully refined.
 */

/** A class's badge (public/gear/classes/<id>.png). One the site has no picture of shows nothing. */
function badge(cls: RaidClass, className: string): HTMLImageElement {
  const img = el('img', className);
  img.src = `/gear/classes/${cls.id}.png`;
  img.alt = '';
  img.draggable = false;
  img.addEventListener('error', () => img.remove(), { once: true });
  return img;
}

const itemsOf = (ctx: DatabankContext, cls: RaidClass): DatabankItem[] => ctx.databank?.items.filter((item) => item.class === cls.id && item.source !== 'technomagic') ?? [];

export function renderClasses(ctx: DatabankContext): void {
  renderClassList(ctx);
  renderClass(ctx);
}

/** A card for each class; picking one shows it. */
function renderClassList(ctx: DatabankContext): void {
  const { ui, databank } = ctx;
  const classes = databank?.classes ?? [];
  ui.classList.replaceChildren(
    ...classes.map((cls) => {
      const card = el('button', 'db-class-card');
      card.type = 'button';
      card.classList.toggle('picked', cls.id === ctx.cls);
      card.setAttribute('aria-pressed', String(cls.id === ctx.cls));
      card.append(badge(cls, 'db-class-card-badge'), el('span', 'db-class-card-name', cls.name));
      card.addEventListener('click', () => {
        ctx.cls = cls.id;
        renderClasses(ctx);
        // On narrow screens the class is under the cards: there, once picked.
        if (ui.classInfo.getBoundingClientRect().top > window.innerHeight * 0.6) ui.classInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return card;
    }),
  );
  // The one picked stays in sight where the cards scroll (sideways, on narrow screens), without moving the page.
  const picked = ui.classList.querySelector('.picked');
  if (picked) {
    const box = ui.classList.getBoundingClientRect();
    const at = picked.getBoundingClientRect();
    if (at.left < box.left || at.right > box.right) ui.classList.scrollLeft += at.left - box.left - 4;
    if (at.top < box.top || at.bottom > box.bottom) ui.classList.scrollTop += at.top - box.top - 4;
  }
  ui.classCount.textContent = `${classes.length} ${classes.length === 1 ? 'class' : 'classes'}`;
}

/** A class item: its card (it opens the item in the items), and beside it what it does fully refined. */
function classItem(item: DatabankItem): HTMLElement {
  const row = el('div', 'db-class-item');
  const about = el('div', 'db-class-item-about');
  const top = item.effects.length;
  about.append(el('strong', '', item.name), el('small', '', `At R${top}`), ...lines(item.effects[top - 1] ?? []));
  row.append(itemCard(item), about);
  return row;
}

/** The class picked. */
function renderClass(ctx: DatabankContext): void {
  const { ui } = ctx;
  const cls = classById(ctx, ctx.cls);
  ui.classBody.textContent = '';
  ui.classInfo.hidden = !cls;
  if (!cls) return;
  ui.classInfo.setAttribute('aria-label', cls.name);

  const head = el('div', 'db-class-head');
  const title = el('div', 'detail-title');
  title.append(el('h3', '', cls.name), el('p', 'detail-meta db-kind', 'Raid Class'));
  head.append(badge(cls, 'db-class-picture'), title);
  ui.classBody.append(head);

  // A bot from before it said what classes do sends none of it.
  const traits = cls.traits ?? [];
  if (traits.length > 0) ui.classBody.append(label('In a raid'), ...lines(traits), el('p', 'db-boss-note', `Everything else is as for a raider without a class.`));

  const items = itemsOf(ctx, cls);
  if (items.length > 0) {
    const note = el('p', 'db-boss-text');
    note.append(rich(`${items.length === 1 ? 'Its effects' : 'Their effects'} only work for a raider of the **${cls.name}** class.`));
    ui.classBody.append(label(items.length === 1 ? 'Class item' : 'Class items'), note, ...items.map(classItem));
  }
}

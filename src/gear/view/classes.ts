import { el } from '../../shared/items';
import { remember, remembered } from '../../shared/util';
import { mine, wearOnly, type GearContext } from './context';

/*
 * Their class: its badge on the stage's ribbon, and the picker the ribbon opens (a small box pointing up
 * at it, over a shade on the rest of the page, with a button for each class).
 *
 * The class is the bot's (GearView.class, and each roster member's): picking one saves it there
 * (POST /api/gear/class, from ./controls.ts), and it counts from their next raid's fight. It is also kept
 * in this browser, which is all there is against a bot from before classes (nobody else sees it then).
 */

export const CLASSES = ['knight', 'warrior', 'assassin', 'archer', 'mechanic', 'wizard', 'priest'] as const;
export type HeroClass = (typeof CLASSES)[number];

const CLASS_NAME: Record<HeroClass, string> = { knight: 'Knight', warrior: 'Warrior', assassin: 'Assassin', archer: 'Archer', mechanic: 'Mechanic', wizard: 'Wizard', priest: 'Priest' };

/** A class's badge (public/gear/classes). */
const classIcon = (heroClass: HeroClass): string => `/gear/classes/${heroClass}_default.png`;

const CLASS_KEY = 'koma.class';
const isClass = (value: string | null): value is HeroClass => (CLASSES as readonly string[]).includes(value ?? '');
const kept = remembered(CLASS_KEY);
let picked: HeroClass | null = isClass(kept) ? kept : null;

/** The class they've picked (null: none yet). */
export const pickedClass = (): HeroClass | null => picked;

export function pickClass(heroClass: HeroClass): void {
  picked = heroClass;
  remember(CLASS_KEY, heroClass);
}

/** A class's name, as the Common tab says it (a question mark for none). */
export const classLabel = (heroClass: HeroClass | null): string => (heroClass ? CLASS_NAME[heroClass] : '?');

/** A class as the bot names it: one of the page's, or none (null, or one the page doesn't know). */
export const classOf = (value: string | null | undefined): HeroClass | null => (isClass(value ?? null) ? (value as HeroClass) : null);

/** Whether the bot keeps classes (its gear view says theirs): then picking one saves it there. */
export const botHasClasses = (ctx: GearContext): boolean => ctx.gear?.class !== undefined;

/** Takes their own class from the bot, when what's shown is their own gear (a bot from before classes says none: the browser's stays). */
function sync(ctx: GearContext): void {
  const own = ctx.viewing === null || ctx.viewing.you;
  if (own && ctx.gear && ctx.gear.class !== undefined) picked = classOf(ctx.gear.class);
}

/** A badge (the ribbon's, a roster portrait's) showing `heroClass`: its picture, or a question mark for none. */
export function showClass(badge: HTMLElement, heroClass: HeroClass | null): void {
  badge.classList.toggle('set', heroClass !== null);
  badge.title = `Class: ${heroClass ? CLASS_NAME[heroClass] : '?'}`;
  if (!heroClass) return void (badge.textContent = '?');
  const icon = el('img');
  icon.src = classIcon(heroClass);
  icon.alt = '';
  icon.draggable = false;
  badge.replaceChildren(icon);
}

/** Whether the ribbon opens the picker: on the gear page, over their own gear. */
const canPick = (ctx: GearContext): boolean => mine(ctx) && !wearOnly(ctx);

/** The class of whoever's gear is shown: their own, or the bot's word on anyone else's. */
export function shownClass(ctx: GearContext): HeroClass | null {
  sync(ctx);
  return ctx.viewing === null || ctx.viewing.you ? picked : classOf(ctx.gear?.class);
}

/** The ribbon: the class of whoever's gear is shown, and whether it opens the picker. */
export function renderClass(ctx: GearContext): void {
  const { ui } = ctx;
  const heroClass = shownClass(ctx);
  showClass(ui.classIcon, heroClass);
  const pick = canPick(ctx);
  ui.classButton.disabled = !pick;
  const name = heroClass ? CLASS_NAME[heroClass] : null;
  ui.classButton.title = pick ? (name ? `Class: ${name}. Change it` : 'Choose your class') : ui.classIcon.title;
  ui.classButton.setAttribute('aria-label', ui.classButton.title);
  if (!pick) showClassPick(ctx, false);
  for (const option of options(ctx)) option.setAttribute('aria-pressed', String(option.dataset.class === picked));
}

const options = (ctx: GearContext): HTMLButtonElement[] => [...ctx.ui.classOptions.querySelectorAll<HTMLButtonElement>('.class-option')];

/** The picker's buttons, one for each class: its badge over its name. */
export function fillClassPick(ctx: GearContext): void {
  for (const heroClass of CLASSES) {
    const option = el('button', 'class-option');
    option.type = 'button';
    option.dataset.class = heroClass;
    const icon = el('img', 'class-option-icon');
    icon.src = classIcon(heroClass);
    icon.alt = '';
    icon.draggable = false;
    option.append(icon, el('span', 'class-option-name', CLASS_NAME[heroClass]));
    ctx.ui.classOptions.append(option);
  }
}

/** Opens or closes the picker. Open, the keyboard goes to the class they have (or the first); closed, back to the ribbon. */
export function showClassPick(ctx: GearContext, open: boolean): void {
  const { ui } = ctx;
  if (ui.classPick.hidden === !open) return;
  const within = ui.classPick.contains(document.activeElement);
  ui.classPick.hidden = !open;
  ui.classShade.hidden = !open;
  ui.classButton.setAttribute('aria-expanded', String(open));
  if (open) (options(ctx).find((option) => option.dataset.class === picked) ?? options(ctx)[0])?.focus();
  else if (within) ui.classButton.focus();
}

/** The keyboard in the picker: the arrows (and Tab) go from one class to the next, round and round, never out of it. */
export function classPickKey(ctx: GearContext, event: KeyboardEvent): void {
  const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey);
  const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey);
  if (!forward && !back) return;
  event.preventDefault();
  const all = options(ctx);
  const at = all.indexOf(document.activeElement as HTMLButtonElement);
  all[(at + (forward ? 1 : -1) + all.length) % all.length]?.focus();
}

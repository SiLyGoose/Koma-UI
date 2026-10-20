import { el, rich } from '../shared/items';
import { DRAGON_LIST } from '../shared/raids';
import { ESSENCE_NAME, essencePicture, type EssenceId } from './transcend';
import type { Databank } from '../protocol/databank';
import type { HeroesContext } from './context';

/*
 * Where a hero essence comes from, as the databank's items say theirs ("Obtainable from"): pressing one of the Stats
 * tab's Transcend costs shows it under them. The Dragon Raid's dragons that give it (two kinds each, the site's raid list:
 * ../shared/raids.ts; Armarta's second rolled each win, so any of them now and then), and the Weekly Bosses that give it
 * with their komaGems (three kinds each, the bot's: its databank's rewards, asked for once, the first time one is pressed).
 * Each goes to its page in the databank's enemies (in the raid's Manage popup, in another tab: its host's go).
 */

/** A Weekly Boss that gives some essence: its id, its name and emoji, and the kinds it gives. */
interface WeeklySource {
  id: string;
  name: string;
  emoji: string;
  essences: EssenceId[];
}

/** The Weekly Bosses' essences, asked for once (null: the bot didn't say). */
let weekly: Promise<WeeklySource[] | null> | null = null;

function weeklySources(ctx: HeroesContext): Promise<WeeklySource[] | null> {
  weekly ??= ctx.host.api<Databank>('/api/databank').then((res) => {
    if (!res.ok) {
      // Asked again the next time one is pressed.
      weekly = null;
      return null;
    }
    // The kinds it gives at any level (a level that gives none of them leaves them out).
    return (res.data.bosses ?? []).map((boss) => ({
      id: boss.id,
      name: boss.name,
      emoji: boss.emoji,
      essences: [...new Set((boss.rewards ?? []).flatMap((paid) => (Object.entries(paid.essences) as [EssenceId, number][]).filter(([, amount]) => amount > 0).map(([id]) => id)))],
    }));
  });
  return weekly;
}

/** A box for one place it comes from: its picture, its name, which raid it is, and a line besides (if any); pressed, its page in the databank. */
function sourceBox(ctx: HeroesContext, id: string, face: Node, name: string, raid: string, note?: string): HTMLButtonElement {
  const box = el('button', 'essence-source');
  box.type = 'button';
  box.title = `${name} in the databank`;
  const text = el('span', 'essence-source-text');
  text.append(el('span', 'essence-source-name', name));
  if (note) text.append(el('span', 'essence-source-note', note));
  box.append(el('span', 'essence-source-face'), text, el('span', 'essence-source-raid', raid));
  box.firstElementChild?.append(face);
  box.addEventListener('click', () => ctx.host.go(`/databank/enemies/#${encodeURIComponent(id)}`));
  return box;
}

/** A dragon's portrait (King's Raid's, as the databank's enemies have it). */
const dragonFace = (id: string): HTMLImageElement => {
  const img = el('img', '');
  img.src = `${import.meta.env.BASE_URL}kr/bosses/${id}/portrait.webp`;
  img.alt = '';
  img.draggable = false;
  return img;
};

/**
 * Where essence `id` comes from, under the costs: its picture and name, how many they have (their own heroes), and a box for each
 * place (the Weekly Bosses' once the bot has said them). `redraw` draws the Stats tab's Transcend again (closed: its ×).
 */
export function essenceSources(ctx: HeroesContext, id: EssenceId, have: number | null, redraw: () => void): HTMLElement {
  const panel = el('div', 'essence-sources');
  panel.id = 'essence-sources';
  const head = el('div', 'essence-sources-head');
  const picture = el('img', 'essence-sources-icon');
  picture.src = essencePicture(id);
  picture.alt = '';
  const close = el('button', 'essence-sources-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', () => {
    ctx.essence = null;
    redraw();
  });
  head.append(picture, el('span', 'essence-sources-name', `${ESSENCE_NAME[id]} essence`));
  if (have !== null) head.append(el('span', 'essence-sources-have', `You have ${have.toLocaleString('en-US')}`));
  head.append(close);
  const boxes = el('div', 'essence-source-boxes');
  // The dragons that always give it, then Armarta (its second kind, one rolled each win).
  for (const card of DRAGON_LIST.cards) {
    const kinds = card.rewards.flatMap((reward) => (reward.kind === 'essence' ? [reward.id] : []));
    if (kinds.includes(id)) boxes.append(sourceBox(ctx, card.id, dragonFace(card.id), card.name, 'Dragon Raid', card.title));
  }
  for (const card of DRAGON_LIST.cards) {
    const kinds = card.rewards.flatMap((reward) => (reward.kind === 'essence' ? [reward.id] : []));
    if (!kinds.includes(id) && kinds.includes(null)) boxes.append(sourceBox(ctx, card.id, dragonFace(card.id), card.name, 'Dragon Raid', 'Sometimes: one kind rolled each win'));
  }
  const pending = el('p', 'essence-sources-wait', 'Looking up the Weekly Bosses…');
  boxes.append(pending);
  void weeklySources(ctx).then((bosses) => {
    // Closed, or another essence's, meanwhile: nothing to add to.
    if (!pending.isConnected) return;
    if (!bosses) {
      pending.textContent = 'The Weekly Bosses give them too, with komaGems: see them in the databank.';
      return;
    }
    const face = (emoji: string): HTMLElement => {
      const box = el('span', 'essence-source-emoji');
      box.append(rich(emoji));
      return box;
    };
    pending.replaceWith(...bosses.filter((boss) => boss.essences.includes(id)).map((boss) => sourceBox(ctx, boss.id, face(boss.emoji), boss.name, 'Weekly Boss', 'With komaGems')));
  });
  panel.append(head, el('p', 'essence-sources-label', 'Obtainable from'), boxes);
  return panel;
}

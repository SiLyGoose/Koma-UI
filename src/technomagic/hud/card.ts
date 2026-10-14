import type { Ability } from '../heroes/kit';
import { square, type Buff } from './buff';
import { el } from './dom';

/*
 * A hero's card, along the bottom of the field: the hero itself looking out from behind it, a health
 * bar and a mana bar in sections, its Auto, and its abilities, each with what it costs and how long
 * until it can be used again.
 */

/** A card's slots: a hero with fewer abilities has the rest empty. */
const SLOTS = 3;

/** How a hero stands, for its card. */
export interface CardState {
  /** On the field. */
  picked: boolean;
  hp: number;
  maxHp: number;
  /** Its mana, in the sections of its bar: whole ones can be spent, the next is filling. */
  mana: number;
  maxMana: number;
  auto: boolean;
  /** Seconds until each ability can be used again. */
  cooldowns: readonly number[];
  /** The ability it will use as soon as it is free (null: none). */
  reserved: number | null;
  /** A skill of its own has it quickened: its card glows. */
  awake: boolean;
  /** What its skills have given it for now, after its passives over its health. */
  effects: readonly Buff[];
}

export interface Card {
  root: HTMLElement;
  draw(state: CardState): void;
}

/** A hero's card, its passives over its health, its mana bar in `sections`. `on` is told what is pressed: the hero (to put it on the field, or take it off), its Auto, an ability. */
export function makeCard(name: string, face: string, abilities: readonly Ability[], passives: readonly Buff[], sections: number, on: { toggle(): void; auto(): void; use(index: number): void }): Card {
  const root = el('section', 'tm-card');
  root.setAttribute('aria-label', name);

  const portrait = el('button', 'tm-face');
  portrait.type = 'button';
  const picture = el('img', '');
  picture.src = face;
  picture.alt = '';
  picture.draggable = false;
  portrait.append(picture);
  portrait.addEventListener('click', on.toggle);

  const auto = el('button', 'tm-auto', 'Auto');
  auto.type = 'button';
  auto.addEventListener('click', on.auto);
  const hp = el('i', '');
  const health = el('div', 'tm-bar tm-hp');
  health.append(hp);
  // The mana bar: a section for each mana there can be.
  const power = el('div', 'tm-mp');
  power.setAttribute('role', 'img');
  const cells = Array.from({ length: sections }, () => {
    const cell = el('span', '');
    const fill = el('i', '');
    cell.append(fill);
    power.append(cell);
    return { cell, fill };
  });
  // Over its health: a square for each passive, then one for each thing a skill has given it for now.
  const buffs = el('div', 'tm-buffs');
  const timed = el('span', 'tm-timed');
  buffs.append(...passives.map(square), timed);
  let shown = '';
  const bars = el('div', 'tm-bars');
  bars.append(buffs, health, power);
  const top = el('div', 'tm-top');
  top.append(auto, bars);

  const skills = el('div', 'tm-skills');
  const slots = Array.from({ length: SLOTS }, (_, i) => {
    const ability = abilities[i];
    const slot = el('button', 'tm-skill');
    slot.type = 'button';
    const wait = el('b', 'tm-wait');
    const pips = el('span', 'tm-pips');
    if (ability) {
      slot.title = `${ability.name}${ability.cost ? ` · ${ability.cost} mana` : ''}`;
      slot.setAttribute('aria-label', slot.title);
      for (let pip = 0; pip < ability.cost; pip++) pips.append(el('i', ''));
      const icon = el('span', 'tm-icon', ability.icon);
      if (ability.image) {
        const picture = el('img', 'tm-art');
        picture.alt = '';
        picture.draggable = false;
        // Not there: its icon stays. (Read already, as the page does before it makes the cards, it is there at once.)
        picture.addEventListener('load', () => icon.replaceChildren(picture));
        picture.src = ability.image;
        if (picture.complete && picture.naturalWidth > 0) icon.replaceChildren(picture);
      }
      slot.append(icon, wait, el('em', 'tm-reserved', 'Reserved'), pips);
      slot.addEventListener('click', () => on.use(i));
    } else {
      slot.disabled = true;
      slot.classList.add('empty');
      slot.setAttribute('aria-label', 'No ability');
    }
    skills.append(slot);
    return { slot, wait, ability };
  });

  root.append(portrait, top, skills);

  return {
    root,
    draw(state) {
      root.classList.toggle('picked', state.picked);
      const says = `${name}: ${state.picked ? 'take off' : 'put on'} the field`;
      if (portrait.title !== says) {
        portrait.title = says;
        portrait.setAttribute('aria-label', says);
      }
      root.classList.toggle('down', state.hp <= 0);
      root.classList.toggle('awake', state.awake);
      const showing = state.effects.map((buff) => `${buff.name}:${Math.ceil(buff.left ?? 0)}:${buff.count ?? ''}`).join('|');
      if (showing !== shown) {
        shown = showing;
        timed.replaceChildren(...state.effects.map(square));
      }
      hp.style.width = `${Math.max(0, (state.hp / state.maxHp) * 100)}%`;
      cells.forEach(({ cell, fill }, i) => {
        const part = Math.min(1, Math.max(0, state.mana - i));
        fill.style.width = `${part * 100}%`;
        cell.classList.toggle('full', part >= 1);
      });
      power.setAttribute('aria-label', `${Math.floor(state.mana)} of ${state.maxMana} mana`);
      auto.setAttribute('aria-pressed', String(state.auto));
      slots.forEach(({ slot, wait, ability }, i) => {
        if (!ability) return;
        const left = state.cooldowns[i] ?? 0;
        const text = left > 0 ? String(Math.ceil(left)) : '';
        if (wait.textContent !== text) wait.textContent = text;
        slot.classList.toggle('waiting', left > 0);
        slot.classList.toggle('reserved', state.reserved === i);
        slot.classList.toggle('short', left <= 0 && state.mana < ability.cost);
        slot.disabled = !state.picked || state.hp <= 0;
      });
    },
  };
}

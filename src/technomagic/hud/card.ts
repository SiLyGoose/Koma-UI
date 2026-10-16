import { artPicture } from '../art';
import type { Ability } from '../sim/heroes/kit';
import type { Buff } from '../sim/shown';
import { about, buffTip, square } from './buff';
import { el } from './dom';
import { holdTip, nameTips, pointTips } from './tip';

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
  /** What each slot holds for now: its own ability, another its abilities have turned into, or null (sealed). */
  slots: readonly (Ability | null)[];
  /** The ability it will use as soon as it is free (null: none). */
  reserved: number | null;
  /** The ability it is using now (null: none): its others say it is casting. */
  casting: number | null;
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
  portrait.dataset.name = name;
  const picture = el('img', '');
  picture.src = face;
  picture.alt = '';
  picture.draggable = false;
  portrait.append(picture);
  portrait.addEventListener('click', on.toggle);
  // Pointed at with a mouse: whose card it is.
  nameTips(portrait, '.tm-face');

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
  // A square pointed at with a mouse: what it is, over it.
  const pointed = pointTips(buffs, '.tm-buff', buffTip);
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
    const icon = el('span', 'tm-icon');
    /** Shows an ability in it: its name, its picture (or its icon), and what it costs. */
    const show = (shown: Ability): void => {
      slot.setAttribute('aria-label', `${shown.name}${shown.cost ? ` · ${shown.cost} mana` : ''}`);
      pips.replaceChildren(...Array.from({ length: shown.cost }, () => el('i', '')));
      icon.textContent = shown.icon;
      const image = artPicture(shown.art);
      if (!image) return;
      const picture = el('img', 'tm-art');
      picture.alt = '';
      picture.draggable = false;
      // Not there: its icon stays. (Read already, as the page does before it makes the cards, it is there at once.)
      picture.addEventListener('load', () => {
        if (showing === shown) icon.replaceChildren(picture);
      });
      picture.src = image;
      if (picture.complete && picture.naturalWidth > 0) icon.replaceChildren(picture);
    };
    /** The ability it shows: its own, or what that has turned into. */
    let showing = ability;
    if (ability) {
      show(ability);
      // Reserved: two lights going round its edge. While another of its hero's is being used: saying so.
      slot.append(icon, wait, el('span', 'tm-lights'), el('em', 'tm-casting', 'Casting...'), pips);
      // Not disabled when it can't be used, so it can still be held down on for what it does.
      slot.addEventListener('click', () => {
        if (slot.getAttribute('aria-disabled') !== 'true') on.use(i);
      });
      holdTip(slot, () => (showing ? abilityTip(showing) : null));
    } else {
      slot.disabled = true;
      slot.classList.add('empty');
      slot.setAttribute('aria-label', 'No ability');
    }
    skills.append(slot);
    return {
      slot,
      wait,
      ability,
      /** Shows what it holds for now (a sealed one shows its own). */
      hold(now: Ability): void {
        if (now === showing) return;
        showing = now;
        show(now);
      },
    };
  });

  root.append(portrait, top, skills);

  return {
    root,
    draw(state) {
      root.classList.toggle('picked', state.picked);
      const says = `${name}: ${state.picked ? 'take off' : 'put on'} the field`;
      if (portrait.getAttribute('aria-label') !== says) portrait.setAttribute('aria-label', says);
      root.classList.toggle('down', state.hp <= 0);
      root.classList.toggle('awake', state.awake);
      const showing = state.effects.map((buff) => `${buff.name}:${Math.ceil(buff.left ?? 0)}:${buff.count ?? ''}`).join('|');
      if (showing !== shown) {
        shown = showing;
        timed.replaceChildren(...state.effects.map(square));
        pointed();
      }
      hp.style.width = `${Math.max(0, (state.hp / state.maxHp) * 100)}%`;
      cells.forEach(({ cell, fill }, i) => {
        const part = Math.min(1, Math.max(0, state.mana - i));
        fill.style.width = `${part * 100}%`;
        cell.classList.toggle('full', part >= 1);
      });
      power.setAttribute('aria-label', `${Math.floor(state.mana)} of ${state.maxMana} mana`);
      auto.setAttribute('aria-pressed', String(state.auto));
      slots.forEach(({ slot, wait, ability, hold }, i) => {
        if (!ability) return;
        const now = state.slots[i] === undefined ? ability : state.slots[i];
        hold(now ?? ability);
        const sealed = now === null;
        const left = state.cooldowns[i] ?? 0;
        const text = sealed ? '🔒' : left > 0 ? String(Math.ceil(left)) : '';
        if (wait.textContent !== text) wait.textContent = text;
        slot.classList.toggle('sealed', sealed);
        slot.classList.toggle('waiting', !sealed && left > 0);
        slot.classList.toggle('reserved', state.reserved === i);
        slot.classList.toggle('casting', state.casting !== null && state.casting !== i);
        slot.classList.toggle('short', !sealed && left <= 0 && state.mana < (now ?? ability).cost);
        slot.setAttribute('aria-disabled', String(!state.picked || state.hp <= 0));
      });
    },
  };
}

/** What an ability's popup says (./tip.ts): its picture, by it its name, what it costs and how long before it can be used again; under them, what it does. */
function abilityTip(ability: Ability): Node[] {
  const art = el('span', 'tm-tip-art', ability.icon);
  const image = artPicture(ability.art);
  if (image) {
    const picture = el('img', '');
    picture.alt = '';
    picture.draggable = false;
    picture.addEventListener('load', () => art.replaceChildren(picture));
    picture.src = image;
    if (picture.complete && picture.naturalWidth > 0) art.replaceChildren(picture);
  }
  const pips = el('span', 'tm-tip-pips');
  pips.append(...Array.from({ length: ability.cost }, () => el('i', '')));
  const cost = el('span', 'tm-tip-cost');
  cost.append(pips, ability.cost ? `${ability.cost} mana` : 'No mana');
  const facts = el('div', 'tm-tip-facts');
  facts.append(el('strong', 'tm-tip-name', ability.name), cost, el('span', 'tm-tip-cooldown', ability.cooldown ? `⏱ ${ability.cooldown}s cooldown` : '⏱ No cooldown'));
  const head = el('div', 'tm-tip-ability');
  head.append(art, facts);
  return ability.about ? [head, about(ability.about)] : [head];
}

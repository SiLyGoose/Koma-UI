import './raid-info.css';
import { bossSkills } from '../../shared/boss-skills';
import { bossRewards, dragonTierAt } from '../../shared/raid-rewards/boss-gear';
import { raidRewards } from '../../shared/raid-rewards/raid-rewards';
import { recommendedCard } from '../../shared/recommended-card/recommended-card';
import { DRAGON_LIST, raidCard, TM_LIST } from '../../shared/raids';
import { RECOMMENDED, recommendedIn } from '../../databank/recommended';
import { el } from '../hud/dom';
import { BOSSES, isDragon } from '../sim/bosses';
import { stagesOf, type BossDef } from '../sim/bosses/boss';
import { DOWN } from '../sim/bosses/gauge';
import { RAID_TIME } from '../sim/rules';
import type { RaidMode } from '../../protocol/technomagic';

/*
 * Raid Info, as King's Raid's own window has it (its RaidInfo prefab, ./raid-info.css): its title across the top, the boss
 * on the left (King's Raid's portrait of it in its monster frame, where the game turns its model; its name over it, and the
 * raid's mode and stage in red above that), and on the right three tabs. More Info: its Characteristics (how to beat it,
 * in the game's words for the raid's boss, then how the raid goes) and the Recommended Heroes in the mode being played. Skill Info: its skills, a row each, alternately shaded, each with its icon and what it does
 * (../../shared/boss-skills.ts). Rewards: what a win gives, its gear as each kind of the boss's set it drops (as the databank's,
 * ../../shared/raid-rewards/boss-gear.ts: a click shows a sample piece, of the tier the stage being played drops). Its ✕, the dark round it and Escape close it.
 * In a room's prep screen (./prep.ts), and from the front page's Raid List (openRaidInfo, which it reads only once asked:
 * ../../hub/raid-list.ts), where no stage is picked yet.
 */

export interface RaidInfo {
  /** The dark over the page, the window in it (hidden until opened). */
  readonly root: HTMLElement;
  open(): void;
  close(): void;
  /** The raid's mode and stage now (the boss's other mode: its recommended heroes; null: none picked, its first stage's rewards). */
  show(mode: RaidMode, stage: number | null): void;
}

/** The window's size in King's Raid's units, its title past it on both sides (Spr_Raid_Title), and how much room it leaves round it. */
const WIDE = 1744;
const HIGH = 1010;
const MARGIN = 16;
/** Narrow and upright (a phone held up): the window's parts one under another, this wide. */
const TALL_WIDE = 840;
/** How far its title reaches over the top of the window, upright. */
const TITLE_ABOVE = 41;

type Tab = 'info' | 'skills' | 'rewards';
const TABS: readonly { tab: Tab; name: string }[] = [
  { tab: 'info', name: 'More Info' },
  { tab: 'skills', name: 'Skill Info' },
  { tab: 'rewards', name: 'Rewards' },
];

/** How long a boss's raid lasts, as its timer shows it (3:00). */
const clockOf = (boss: BossDef): string => {
  const time = boss.time ?? RAID_TIME;
  return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`;
};

/** Characteristics after the game's tip: how the boss's raid goes. */
function rulesOf(boss: BossDef): string[] {
  const solo = Math.round(((boss.stages.solo[0]?.hp ?? 1) / (boss.stages.room[0]?.hp ?? 1)) * 100);
  const lineup = (all: number, alone: number): string =>
    `With others, the host brings up to 4 heroes, everyone else up to 3, ${all} in all. Single player, up to ${alone}: 4 in the Main Team, whose skills are yours to use, and ${alone - 4} in the Sub Team, who fight on Auto.`;
  if (isDragon(boss.id)) {
    const normal = boss.normal ? stagesOf(boss.normal) : 0;
    return [
      `Its CC Gauge: no stun holds a dragon, but your heroes' stuns wear the gauge down (it fills again soon after); empty, it is Down for ${DOWN} seconds, its breath cut short.`,
      `Two modes, King's Raid's: Normal, its Normal Dragon Raid (${normal} stages, the first far easier than Hard's, the last harder than any), and Hard, its Hard Dragon Raid (${stagesOf(boss)} stages). Each stage has more health and defense and hits harder.`,
      `Heroes that fall stay down. Beat it within ${clockOf(boss)}, before its rage wipes the party. Single player, it has ${solo}% of the health.`,
      `${lineup(9, 8)} A win gives every player pieces of the dragon's own gear set, runes, zeiucoins and hero essences of the dragon's two kinds, more at each stage; a Normal stage as tough as one of Hard's pays as that one does. There is no daily limit.`,
      'The host picks the mode and the stage in Raid Settings: each stage after the first opens once they have beaten the one before it, each dragon and mode apart.',
    ];
  }
  return [
    `Its Swamp Destroyer knocks every hero down. No stun holds it, but stuns wear its CC Gauge down (it fills again soon after); empty, it is Down for ${DOWN} seconds.`,
    `Heroes that fall stay down. Beat it within ${clockOf(boss)}, before its rage wipes the party. Each stage, it has more health and hits harder; single player, it has ${solo}% of the health.`,
    `${lineup(8, 7)} A win gives each player TechnoMagic gear and zeiucoins.`,
    'The host picks the stage: each after the first opens once they have beaten the one before it.',
  ];
}

/** Each Raid Info made, for its title's id. */
let made = 0;

/** A box on the parchment with its heading on the ornament over it (RaidInfo_Title_Small). */
function section(heading: string, className: string): [HTMLElement, HTMLElement] {
  const box = el('section', `ri-section ${className}`);
  const body = el('div', 'ri-section-body');
  box.append(el('h3', 'ri-heading', heading), body);
  return [box, body];
}

/** Its skills, a row each (RaidSkillComponent): the icon in its slot, the name, Passive for one always on it, and what it does. */
function skillRows(boss: BossDef): HTMLElement {
  const list = el('ul', 'ri-skills');
  const skills = bossSkills(boss.id);
  const row = (src: string, name: string, about: string, passive: boolean): void => {
    const item = list.appendChild(el('li', 'ri-skill'));
    const slot = el('span', 'ri-skill-slot');
    const icon = el('img', '');
    icon.src = src;
    icon.alt = '';
    icon.draggable = false;
    slot.append(icon);
    const head = el('div', 'ri-skill-head');
    head.append(el('b', 'ri-skill-name', name));
    if (passive) head.append(el('span', 'ri-skill-type', 'Passive'));
    item.append(slot, head, el('p', 'ri-skill-about', about));
  };
  if (!skills) {
    for (const attack of boss.attacks) row(`/kr/ui/deals-${boss.stats.deals}.webp`, attack.label, '', false);
    return list;
  }
  for (const skill of skills.skills) row(skill.icon, skill.name, skill.about, skill.attacks.length === 0);
  row(`/kr/ui/deals-${boss.stats.deals}.webp`, 'Attack', skills.basic.about, false);
  return list;
}

export function raidInfo(boss: BossDef, rules: readonly string[] = rulesOf(boss)): RaidInfo {
  const card = raidCard(boss.id);
  const dragon = isDragon(boss.id);

  const root = el('div', 'ri');
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  const titleId = `ri-title-${++made}`;
  root.setAttribute('aria-labelledby', titleId);
  const stage = el('div', 'ri-stage');
  const win = el('div', 'ri-window');
  stage.append(win);
  root.append(stage);

  const title = el('div', 'ri-title');
  const titleText = el('h2', '', 'Raid Info');
  titleText.id = titleId;
  title.append(titleText);
  const close = el('button', 'ri-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');

  // The boss: its portrait in the monster frame, its name over it, and the mode and stage above that.
  const left = el('div', 'ri-boss');
  const view = el('div', 'ri-boss-view');
  const art = `/kr/bosses/${boss.id}/portrait.webp`;
  view.style.setProperty('--art', `url('${art}')`);
  const picture = el('img', 'ri-boss-art');
  picture.src = art;
  picture.alt = '';
  picture.draggable = false;
  view.append(picture);
  const nameBox = el('div', 'ri-name');
  const prefix = el('p', 'ri-name-prefix');
  nameBox.append(prefix, el('p', 'ri-name-text', boss.name));
  left.append(view, el('span', 'ri-boss-frame'), nameBox);

  // The tabs, over the panel each shows.
  const side = el('div', 'ri-side');
  const tabs = el('div', 'ri-tabs');
  tabs.setAttribute('role', 'tablist');
  const panel = el('div', 'ri-panel');
  const panes = new Map<Tab, HTMLElement>();
  const buttons = TABS.map(({ tab, name }) => {
    const button = el('button', 'ri-tab');
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.append(el('span', '', name));
    button.addEventListener('click', () => pick(tab));
    tabs.append(button);
    const pane = el('div', `ri-pane ri-pane-${tab}`);
    pane.setAttribute('role', 'tabpanel');
    panes.set(tab, pane);
    panel.append(pane);
    return { tab, button };
  });
  side.append(tabs, panel);

  // More Info, on its parchment: Characteristics, Recommended Heroes.
  const info = panes.get('info') as HTMLElement;
  const [traits, traitsBody] = section('Characteristics', 'ri-traits');
  if (card) traitsBody.append(el('p', 'ri-tactic', card.tactic));
  traitsBody.append(...rules.map((line) => el('p', '', line)));
  const [heroes, heroesBody] = section('Recommended Heroes', 'ri-heroes');
  info.append(traits, heroes);

  (panes.get('skills') as HTMLElement).append(skillRows(boss));
  const rewards = card?.rewards ?? [];
  if (rewards.length === 0) buttons.find(({ tab }) => tab === 'rewards')?.button.remove();

  win.append(title, left, side, close);

  function pick(tab: Tab): void {
    for (const { tab: one, button } of buttons) {
      button.setAttribute('aria-selected', String(one === tab));
      button.tabIndex = one === tab ? 0 : -1;
    }
    for (const [one, pane] of panes) pane.hidden = one !== tab;
    panel.dataset.tab = tab;
  }

  /** Scaled to fit the window it is in, as King's Raid scales its own; upright and narrow, its parts one under another. */
  function fit(): void {
    if (root.hidden) return;
    const width = window.innerWidth - MARGIN * 2;
    const height = window.innerHeight - MARGIN * 2;
    const tall = window.innerWidth < window.innerHeight && window.innerWidth <= 760;
    root.classList.toggle('tall', tall);
    const scale = tall ? width / TALL_WIDE : Math.min(1, width / WIDE, height / HIGH);
    stage.style.setProperty('--ri-scale', String(scale));
    stage.style.width = `${(tall ? TALL_WIDE : WIDE) * scale}px`;
    stage.style.height = `${(tall ? win.offsetHeight + TITLE_ABOVE : HIGH) * scale}px`;
  }
  window.addEventListener('resize', fit);

  /** The mode its recommended heroes are for, and the tier of gear its rewards are for (null: none yet). */
  let shown: RaidMode | null = null;
  let tier: number | null = null;
  /** What had the focus before it opened, to have it again once it closes. */
  let before: Element | null = null;
  const api: RaidInfo = {
    root,
    open() {
      pick('info');
      before = document.activeElement;
      root.hidden = false;
      fit();
      close.focus();
    },
    close() {
      root.hidden = true;
      if (before instanceof HTMLElement && before.isConnected) before.focus();
    },
    show(mode, at) {
      prefix.textContent = at === null ? '' : boss.normal ? `${mode === 'normal' ? 'Normal' : 'Hard'} · Stage ${at}` : `Stage ${at}`;
      const dropping = dragonTierAt(at ?? 1, mode === 'normal');
      if (rewards.length > 0 && dropping !== tier) {
        tier = dropping;
        (panes.get('rewards') as HTMLElement).replaceChildren(raidRewards(bossRewards(boss.id, rewards, tier), (dragon ? DRAGON_LIST : TM_LIST).rewardNote));
      }
      if (mode === shown) return;
      shown = mode;
      const picks = recommendedIn(boss.id, dragon && mode === 'normal' ? 'normal' : 'hard');
      const why = RECOMMENDED[boss.id]?.picks ?? {};
      heroesBody.replaceChildren(...picks.heroes.flatMap((id) => recommendedCard(id, picks.kr.includes(id), why[id])));
      heroes.hidden = picks.heroes.length === 0;
      if (!root.hidden) fit();
    },
  };
  close.addEventListener('click', api.close);
  // (The dark round it: a press on it, not on the window.)
  root.addEventListener('click', (event) => {
    if (event.target === root || event.target === stage) api.close();
  });
  // Escape, before anything under it hears it (the Raid List it is over would close too); not while a popup over it is
  // open (a gear sample: Escape closes that one).
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || root.hidden) return;
      event.stopPropagation();
      if (!document.querySelector('dialog[open]')) api.close();
    },
    true,
  );
  return api;
}

/** Each boss's Raid Info opened from the front page, made once. */
const opened = new Map<string, RaidInfo>();

/** A boss's Raid Info, opened over the page it is on (the front page's Raid List: no stage picked, its Hard mode's heroes). */
export function openRaidInfo(id: string): void {
  let info = opened.get(id);
  if (!info) {
    const boss = BOSSES.find((one) => one.id === id);
    if (!boss) return;
    info = raidInfo(boss);
    info.show('hard', null);
    document.body.append(info.root);
    opened.set(id, info);
  }
  info.open();
}

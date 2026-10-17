import { put, type Status } from '../../combat/status';
import type { Buff, Mark } from '../../shown';
import type { Fight, Fighter } from '../../types';
import type { BossPart } from '../boss';
import { all, cooldowns, dot, lift, reachable, single, withGauge } from '../dragon/common';
import { INHALE } from '../dragon/moves';

/*
 * What Armarta's skills do, as King's Raid's Black Dragon has it (the game's words: "If you get hit by the Black Dragon's
 * Black Flame Breath, you will be inflicted with the Dark Flames which you will continuously lose HP!"; the rest are first
 * guesses, after the stone and the Black Sun its gear is said to bear):
 * - Black Flame Breath: four blows of black fire over the field, each leaving the Dark Flames for FLAMES.lasts seconds: a
 *   share of the blow again every second, and FLAMES.heals of the healing reaching whoever bears them.
 * - Stone Gaze: the hero that has dealt the most since its last gaze is turned to stone for GAZE.lasts seconds.
 * - Ashen Eclipse: once it has used its skills ECLIPSE.after times, up on its wings and down on the field: a blow on every
 *   hero, ECLIPSE.burning times as hard on one in the Dark Flames; and its blows are ECLIPSE.deals harder for the rest of
 *   the fight (up to ECLIPSE.most times).
 * Its claws and bite are on whoever it is going for, its tail across the field. And its CC Gauge (../dragon/common.ts).
 */
const FLAMES = { lasts: 10, burn: 0.15, heals: 0.5, cooldown: 15 };
const GAZE = { lasts: 4, cooldown: 20 };
export const ECLIPSE = { after: 3, burning: 1.6, deals: 0.1, most: 5 };

const DARK: Buff = { name: 'Dark Flames', about: `Black fire eats at it every second, and ${Math.round((1 - FLAMES.heals) * 100)}% less healing reaches it.`, icon: '🖤', harmful: true };
const STONE: Buff = { name: 'Petrified', about: 'Turned to stone by its gaze: it can do nothing.', icon: '🗿', harmful: true };
const ASHEN = 'Ashen Nox';

export function armartaPart(fight: Fight): BossPart {
  const { foe } = fight;
  const waits = cooldowns({ breath: FLAMES.cooldown, gaze: GAZE.cooldown });
  /** Its skills used toward its eclipse; how hard each hero's Dark Flames are; and what each has dealt since its last gaze. */
  let used = 0;
  const flames = new Map<Fighter, number>();
  const dealt = new Map<Fighter, number>();
  const eating = dot(fight, DARK.name, (fighter) => flames.get(fighter) ?? 0);
  const burning = (fighter: Fighter): boolean => fighter.statuses.some((status) => status.name === DARK.name);

  return withGauge(fight, {
    lands: {
      breath(part, amount) {
        if (part < INHALE) return;
        all(
          fight,
          amount,
          (fighter) => {
            flames.set(fighter, Math.max(burning(fighter) ? (flames.get(fighter) ?? 0) : 0, amount * FLAMES.burn));
            put(fighter.statuses, { name: DARK.name, left: FLAMES.lasts, heals: FLAMES.heals, shown: DARK });
          },
          'black',
        );
      },
      // The one that has dealt the most since its last gaze, turned to stone.
      gaze() {
        const [top] = reachable(fight).sort((a, b) => (dealt.get(b) ?? 0) - (dealt.get(a) ?? 0));
        dealt.clear();
        if (!top) return;
        fight.stagger(top);
        top.reserved = null;
        put(top.statuses, { name: STONE.name, left: GAZE.lasts, binds: true, shown: STONE });
        fight.cue(null, 'gaze', [top]);
      },
      // Down on the field from the air: the harder on those in its flames; and it is the stronger after.
      eclipse(part, amount) {
        if (part !== 1) return;
        const heroes = reachable(fight);
        for (const fighter of heroes) fight.hurt(fighter, amount * (burning(fighter) ? ECLIPSE.burning : 1));
        fight.cue(null, 'eclipse', heroes);
        const count = Math.min(ECLIPSE.most, (foe.statuses.find((status) => status.name === ASHEN)?.count ?? 0) + 1);
        const status: Status<'curse'> = { name: ASHEN, left: Infinity, deals: 1 + ECLIPSE.deals * count, count, shown: 'curse' };
        put(foe.statuses, status);
      },
      bite: (_part, amount) => single(fight, amount),
      claw: (_part, amount) => single(fight, amount),
      sweep: (_part, amount) => void all(fight, amount, undefined, 'sweep'),
    },
    struck(by, amount) {
      dealt.set(by, (dealt.get(by) ?? 0) + amount);
    },
    used(attack) {
      waits.used(attack);
      if (attack === 'breath' || attack === 'gaze') used++;
      else if (attack === 'eclipse') used = 0;
    },
    next: () => (used >= ECLIPSE.after ? 'eclipse' : null),
    ready: (attack) => attack !== 'eclipse' && waits.ready(attack),
    tick(dt) {
      waits.tick(dt);
      eating(dt);
    },
    beaten() {
      used = 0;
      dealt.clear();
      const at = foe.statuses.findIndex((status) => status.name === ASHEN);
      if (at >= 0) foe.statuses.splice(at, 1);
      for (const fighter of fight.fighters) {
        lift(fighter, DARK.name);
        lift(fighter, STONE.name);
      }
    },
    marks: (): Mark[] => [{ text: `Ashen Eclipse ${Math.min(used, ECLIPSE.after)}/${ECLIPSE.after}`, tone: 'curse' }],
  });
}

import type { Sim } from '../sim';

/*
 * What this page has asked of a room's fight that its fight hasn't taken yet: the bot takes each press at its next turn
 * and relays it, so this page's fight has it a turn or so later. Meanwhile its card shows it at once, as it will be (a
 * skill reserved, or let go; Auto on or off). One the fight doesn't take after all is let go after a while.
 */

/** The longest something is shown before the fight has it. */
const LONGEST_MS = 1500;

/** Something shown: as it will be, how many inputs the fight had taken when it was pressed, and when it was (ms). */
interface Shown<T> {
  value: T;
  log: number;
  at: number;
}

export class Ahead {
  private readonly skills = new Map<number, Shown<number | null>>();
  private readonly autos = new Map<number, Shown<boolean>>();

  constructor(private readonly sim: Sim) {}

  /** Hero `fighter`'s skill `skill` is pressed: reserved, or (reserved already) let go. Nothing, for one the fight wouldn't take. */
  press(fighter: number, skill: number): void {
    const one = this.sim.fighters[fighter];
    if (one && this.sim.reservable(one, skill)) this.skills.set(fighter, this.mark(this.reserved(fighter) === skill ? null : skill));
  }

  /** Hero `fighter`'s Auto is turned on or off. */
  toggle(fighter: number): void {
    this.autos.set(fighter, this.mark(!this.auto(fighter)));
  }

  /** Each of `fighters`' Auto turned on (or, with all of them on already, off). */
  toggleAll(fighters: readonly number[]): void {
    const on = !fighters.every((fighter) => this.auto(fighter));
    for (const fighter of fighters) this.autos.set(fighter, this.mark(on));
  }

  /** The skill hero `fighter` will use as soon as it can (null: none), as it will be. */
  reserved(fighter: number): number | null {
    const shown = this.ahead(this.skills, fighter, 'skill');
    return shown ? shown.value : (this.sim.fighters[fighter]?.reserved ?? null);
  }

  /** Whether hero `fighter` is on Auto, as it will be. */
  auto(fighter: number): boolean {
    return this.ahead(this.autos, fighter, 'auto')?.value ?? this.sim.fighters[fighter]?.auto ?? false;
  }

  private mark<T>(value: T): Shown<T> {
    return { value, log: this.sim.log.length, at: performance.now() };
  }

  /** What is shown for hero `fighter` (none: nothing is, or the fight has taken a press of the kind since, or it was let go). */
  private ahead<T>(shown: Map<number, Shown<T>>, fighter: number, kind: 'skill' | 'auto'): Shown<T> | undefined {
    const one = shown.get(fighter);
    if (!one) return undefined;
    const taken = this.sim.log.slice(one.log).some((input) => (input.kind === 'skill' || input.kind === 'auto') && input.kind === kind && input.fighter === fighter);
    if (!taken && performance.now() - one.at <= LONGEST_MS) return one;
    shown.delete(fighter);
    return undefined;
  }
}

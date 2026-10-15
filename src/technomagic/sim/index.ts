/* The fight, worked out with nothing drawn (./fight.ts): what the page draws, and the bot runs (./bot.ts). */

export { SIM_VERSION } from './bot';
export type { Input, Logged, Result, SimEvent } from './events';
export { makeSim, type Entry, type Sim, type SimOptions } from './fight';
export { geared } from './gear';
export * from './rules';
export type { Fight, Fighter, Foe, GearBonus, GearStat } from './types';

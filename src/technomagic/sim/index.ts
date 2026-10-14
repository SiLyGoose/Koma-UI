/* The fight, worked out with nothing drawn (./fight.ts): what the page draws and the bot plays over (./verify.ts). */

export type { Input, Logged, Result, SimEvent } from './events';
export { geared } from './gear';
export { makeSim, type Entry, type Sim, type SimOptions } from './fight';
export * from './rules';
export type { Fight, Fighter, Foe, GearBonus, GearStat } from './types';
export { SIM_VERSION } from './verify';

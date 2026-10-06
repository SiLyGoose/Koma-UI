import { points } from '../shared/util';
import type { Bets } from './protocol';

export const signedPoints = (n: number): string => (n > 0 ? `+${points(n)}` : n < 0 ? `−${points(-n)}` : '±0');
export const chipLabel = (n: number): string => (n >= 1000 ? `${n / 1000}K` : String(n));
export const sumBets = (b: Bets): number => Object.values<number | undefined>(b).reduce<number>((sum, amount) => sum + (amount ?? 0), 0);

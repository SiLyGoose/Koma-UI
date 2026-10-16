import type { BossDef } from './boss';
import { GALGORIA } from './galgoria';

/** The bosses of the TechnoMagic Raid there are so far: the first is the one fought unless another is asked for. */
export const BOSSES: readonly BossDef[] = [GALGORIA];

/** The boss of a name or id (whatever its capitals), or the first with no such boss. */
export const bossNamed = (name: string | null): BossDef =>
  BOSSES.find((boss) => boss.name.toLowerCase() === name?.toLowerCase() || boss.id === name?.toLowerCase()) ?? (BOSSES[0] as BossDef);

import { ARMARTA } from './armarta';
import type { BossDef } from './boss';
import { GALGORIA } from './galgoria';
import { SCALAXIA } from './scalaxia';
import { SIEGFRIED } from './siegfried';
import { TEMERAIRE } from './temeraire';
import { ZYRRKINOTH } from './zyrrkinoth';

/** The bosses of the TechnoMagic Raid there are so far: the first is the one fought unless another is asked for. */
export const TM_BOSSES: readonly BossDef[] = [GALGORIA, SIEGFRIED];
/** The Dragon Raid's dragons, as King's Raid has them: Fire, Frost, Poison and Black. */
export const DRAGONS: readonly BossDef[] = [TEMERAIRE, SCALAXIA, ZYRRKINOTH, ARMARTA];
/** Every boss there is. */
export const BOSSES: readonly BossDef[] = [...TM_BOSSES, ...DRAGONS];

/** The boss of a name or id (whatever its capitals), or the first with no such boss. */
export const bossNamed = (name: string | null): BossDef =>
  BOSSES.find((boss) => boss.name.toLowerCase() === name?.toLowerCase() || boss.id === name?.toLowerCase()) ?? (BOSSES[0] as BossDef);

/** Whether a boss (by its id) is one of the Dragon Raid's. */
export const isDragon = (id: string): boolean => DRAGONS.some((boss) => boss.id === id);

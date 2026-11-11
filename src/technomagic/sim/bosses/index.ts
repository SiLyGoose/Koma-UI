import { ARMARTA } from './armarta';
import { ASCALON } from './ascalon';
import type { BossDef } from './boss';
import { DIVINE_BOSSES } from './divine';
import { GALGORIA } from './galgoria';
import { SCALAXIA } from './scalaxia';
import { SIEGFRIED } from './siegfried';
import { TEMERAIRE } from './temeraire';
import { ZYRRKINOTH } from './zyrrkinoth';

/** The bosses of the TechnoMagic Raid there are so far: the first is the one fought unless another is asked for. */
export const TM_BOSSES: readonly BossDef[] = [GALGORIA, SIEGFRIED, ASCALON];
/** The Dragon Raid's dragons, as King's Raid has them: Fire, Frost, Poison and Black. */
export const DRAGONS: readonly BossDef[] = [TEMERAIRE, SCALAXIA, ZYRRKINOTH, ARMARTA];
/** Divine Punishment's bosses (./divine/): its side bosses, final bosses and karma dungeons, in its order. */
export const DIVINE: readonly BossDef[] = DIVINE_BOSSES;
/** Every boss there is. */
export const BOSSES: readonly BossDef[] = [...TM_BOSSES, ...DRAGONS, ...DIVINE];

/** The boss of a name or id (whatever its capitals), or the first with no such boss. */
export const bossNamed = (name: string | null): BossDef =>
  BOSSES.find((boss) => boss.name.toLowerCase() === name?.toLowerCase() || boss.id === name?.toLowerCase()) ?? (BOSSES[0] as BossDef);

/** Whether a boss (by its id) is one of the Dragon Raid's. */
export const isDragon = (id: string): boolean => DRAGONS.some((boss) => boss.id === id);

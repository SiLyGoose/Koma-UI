import type { RaidReward } from '../raids';
import type { GearKind } from './raid-rewards';
import { showGearSample, type SamplePick } from './gear-sample';

/*
 * The gear a raid's boss drops, as its rewards show it (./raid-rewards.ts): in its gear's place, every kind of its own set's
 * it drops, each with King's Raid's icon for one of them, and a click showing a sample of it (./gear-sample.ts). For the
 * databank's raid bosses (../../databank/bosses.ts) and a raid's Raid Info.
 */

/** A kind of gear a raid's boss drops, as its rewards show it (GearKind), and the piece of it its sample is. */
type BossGear = Omit<GearKind, 'open'> & { sample: SamplePick };

/**
 * The kinds of gear a raid's boss drops, of its own set (King's Raid's: a dragon's Legendary set, Galgoria's Perseverance),
 * each with King's Raid's icon for one of them (public/kr/items/), the piece its sample is: the knight's weapon, the heavy
 * armor and mantle, the necklace. Perseverance has no weapon (a hero's is its unique weapon).
 */
const GEAR_KINDS: Readonly<Record<string, readonly BossGear[]>> = (() => {
  const piece = (icon: string, name: string, piece: string, sample: SamplePick): BossGear => ({ kind: 'piece', icon, name, piece, sample });
  const dragon = (n: number, id: string, set: string): BossGear[] => [
    piece(`WEAPON_KNIGHT_6_5_${n}`, 'Weapon', `${set} weapons (one for each class)`, { set: id, part: 'weapon', heroClass: 'knight' }),
    piece(`ARMOR_HEAVY_6_5_${n}`, 'Armor', `${set} armor (light, medium or heavy)`, { set: id, part: 'armor', kind: 'heavy' }),
    piece(`GEAR_HEAVY_6_5_${n}`, 'Mantle', `${set} mantles (light, medium or heavy)`, { set: id, part: 'secondary', kind: 'heavy' }),
    piece(`ACCESSORY_NECKLACE_6_5_${n}`, 'Accessory', `${set} accessories (a necklace, earrings, a ring or a bracelet)`, { set: id, part: 'accessory', kind: 'necklace' }),
    piece(`ORB_6_5_${n}`, 'Orb', `${set} Orb`, { set: id, part: 'orb' }),
  ];
  const tm = (n: number, id: string, set: string): BossGear[] => [
    piece(`TECHNOMAGIC_KNIGHT_9_1_${n}`, 'Armor', `${set} armor (one for each class)`, { set: id, part: 'armor', heroClass: 'knight' }),
    piece(`TECHNOMAGIC_KNIGHT_9_2_${n}`, 'Mantle', `${set} mantles (one for each class)`, { set: id, part: 'secondary', heroClass: 'knight' }),
    piece(`TECHNOMAGIC_KNIGHT_9_5_${n}`, 'Accessory', `${set} accessories (a necklace, earrings, a ring or a bracelet, for each class)`, { set: id, part: 'accessory', kind: 'necklace', heroClass: 'knight' }),
    piece(`TECHNOMAGIC_KNIGHT_9_7_${n}`, 'Orb', `${set} Orb (one for each class)`, { set: id, part: 'orb', heroClass: 'knight' }),
  ];
  return {
    galgoria: tm(1, 'perseverance', 'Perseverance'),
    temeraire: dragon(1, 'opportune-fire', 'Opportune Fire'),
    scalaxia: dragon(2, 'gritty-frost', 'Gritty Frost'),
    zyrrkinoth: dragon(3, 'unrelenting-poison', 'Unrelenting Poison'),
    armarta: dragon(4, 'swift-darkness', 'Swift Darkness'),
  };
})();

/** The Hard stage each Normal stage pays as (0: easier than all of them, a T6 piece), as the bot's KR_DROPS.normal.paysAs. */
const NORMAL_PAYS_AS: readonly number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 4, 4, 7, 8, 9, 10, 10];

/** The tier of a dragon set's pieces a win at `stage` drops (`normal`: in the Normal Dragon Raid), as the bot's KR_DROPS: Hard T6 at stages 1–3, T7 at 4–7, T8 at 8–10. */
export function dragonTierAt(stage: number, normal: boolean): number {
  const as = normal ? (NORMAL_PAYS_AS[stage - 1] ?? 0) : stage;
  return as >= 8 ? 8 : as >= 4 ? 7 : 6;
}

/**
 * What a win against a raid's boss (`id`) gives, its gear as the kinds of its set's it drops (GEAR_KINDS) in its place, each
 * showing a sample of it (a dragon's, of `tier`: dragonTierAt the stage played or picked) on a click.
 */
export function bossRewards(id: string, rewards: readonly RaidReward[], tier: number): (RaidReward | GearKind)[] {
  const kinds = GEAR_KINDS[id]?.map(({ sample, ...kind }): GearKind => ({ ...kind, open: () => void showGearSample(sample, tier) }));
  return kinds ? rewards.flatMap<RaidReward | GearKind>((reward) => (reward.kind === 'gear' || reward.kind === 'tm' ? kinds : [reward])) : [...rewards];
}

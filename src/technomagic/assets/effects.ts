import type { EffectAssets } from './types.ts';

/** The effects any hero's blow may play: each a folder under public/kr/effects/. */
export const EFFECTS = {
  impact: { folder: 'HitImpact', tint: 0xffc890, size: 1.1 },
  slash: { folder: 'Hit_Physical_Slash01', tint: 0xfff2c4, size: 1.5 },
  // An ability: a ring rising round the hero's feet as it is cast, and a great cut where it lands.
  cast: { folder: 'Common_Casting01', tint: 0x9fd8ff, size: 1.4 },
  blast: { folder: 'Hit_Physical_SlashXL', tint: 0xffffff, size: 1.7 },
} as const satisfies Record<string, EffectAssets>;

export type EffectName = keyof typeof EFFECTS;

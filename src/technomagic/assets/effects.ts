import type { EffectAssets } from './types.ts';

/** The effects any hero's blow may play: each a folder under public/kr/effects/. */
export const EFFECTS = {
  impact: { folder: 'HitImpact', tint: 0xffc890, size: 1.1 },
  slash: { folder: 'Hit_Physical_Slash01', tint: 0xfff2c4, size: 1.5 },
  // An ability: a ring rising round the hero's feet as it is cast, and a great cut where it lands.
  cast: { folder: 'Common_Casting01', tint: 0x9fd8ff, size: 1.4 },
  blast: { folder: 'Hit_Physical_SlashXL', tint: 0xffffff, size: 1.7 },
  // A shield on a hero: a bubble round it, a glow on its face (kept on while the shield is: ../fx/wards.ts).
  shield: { folder: 'Common_Shield', tint: 0xffffff, size: 1 },

  // What comes on a fighter (../fight/view.ts plays them as it does): on a hero, healed (green crossing arcs),
  // its defense raised (a gold shield), its magic defense (a blue one), quickened (a winged boot); on the boss,
  // its defense lowered (a shield breaking), slowed (an hourglass), and stunned (stars going round over it).
  heal: { folder: 'HealBig1', tint: 0xffffff, size: 1.1 },
  guard: { folder: 'Common_DefenseUp', tint: 0xffffff, size: 0.55 },
  ward: { folder: 'Common_DefenseMagicUp', tint: 0xffffff, size: 0.55 },
  haste: { folder: 'Common.SpeedUp', tint: 0xffffff, size: 0.55 },
  weaken: { folder: 'Common.DefenseDown', tint: 0xffffff, size: 2.2, without: ['Common_DefenseDown02'] },
  slow: { folder: 'Common.SpeedDown', tint: 0xffffff, size: 4 },
  stun: { folder: 'stun', tint: 0xffffff, size: 2.2, flat: true },

  // Some heroes' own (their fx.ts): a magic circle on the floor (holy, and fire), a bolt's hit, a fist's, a cannon's
  // flash as it fires, a great burst of fire, a shaft of light falling out of the sky, one rising out of the ground,
  // and the ground breaking up.
  holy: { folder: 'MagicCircle_Holy', tint: 0xffe6a0, size: 1.8, flat: true, lasts: 1.6 },
  flames: { folder: 'MagicCircle_Fire', tint: 0xff8a3a, size: 2.4, flat: true, lasts: 1.6 },
  pierce: { folder: 'Hit_Physical_Pierce01', tint: 0xe2ccff, size: 2.4 },
  strike: { folder: 'Hit_Physical_Strike01', tint: 0xbfe0ff, size: 3 },
  shoot: { folder: 'Common_Shoot', tint: 0x9cf0ff, size: 1 },
  explosion: { folder: 'ExplosionBig', tint: 0xffffff, size: 2.2 },
  falling: { folder: 'FallingLight', tint: 0xc9a2ff, size: 0.8, flat: true },
  rising: { folder: 'BlastingLight', tint: 0x7be05a, size: 1.6, flat: true },
  quake: { folder: 'EarthQuake', tint: 0xffe9a8, size: 1.4, flat: true },
} as const satisfies Record<string, EffectAssets>;

export type EffectName = keyof typeof EFFECTS;

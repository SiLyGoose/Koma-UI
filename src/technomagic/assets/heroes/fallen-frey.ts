import type { HeroAssets, KrAnimations } from '../types.ts';

/**
 * King's Raid's own animations (its skins of the game's files are moved by them: ../../heroes/body/kr.ts): its basic attack's
 * chain, and each skill's clips, with when its blows land in them as the game's timelines have them (KR-extracted/scripts/tm-anims.mjs).
 */
const ANIMATIONS = {
  idle: 'Idle',
  run: 'Run',
  hurt: 'Damage',
  victory: 'Victory',
  lose: 'Lose',
  dead: 'Dead',
  attack: [{ clips: ['Attack1'], hits: [1.1] }],
  skills: {
    light: { clips: ['Skill1'], hits: [1.7] },
    blessing: { clips: ['Skill2'], hits: [1.8] },
    vengeance: { clips: ['Skill3-1', 'Skill3-2', 'Skill3-2', 'Skill3-2', 'Skill3-2', 'Skill3-2', 'Skill3-2', 'Skill3-2', 'Skill3-2', 'Skill3-2', 'Skill3-2', 'Skill3-3'], hits: [1.9, 2.3, 2.7, 3.1, 3.5, 3.9, 4.3, 4.7, 5.1, 5.5, 5.9, 6.3, 6.7, 7.1, 7.5, 7.9, 8.3, 8.7, 9.1, 9.5] },
  },
} as const satisfies KrAnimations;

export const FALLEN_FREY_ASSETS: HeroAssets = {
  name: 'Fallen Frey',
  folder: 'heroes/fallen-frey',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/89/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her dark self rising behind her (Blessing of Doom): her body as the game's effects have it, with the noise it is burnt away by.
  props: { self: 'Hero_Frey_Fallen_Vari05FX_Mesh' },
  // Her unique weapon, wielded: Rosmerta.
  unique: { Hero_Frey_Fallen_Vari05_Weapon: 'Hero_Frey_Fallen_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.FallenFrey.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      smite: [[{ clip: 'Dmg-shot-01', volume: 1.5, at: 0.05 }]],
      vengeance: [[{ clip: 'Dmg-magic-01', volume: 1.5, at: 0.05 }]],
    },
    casts: {
      light: [{ clip: 'FreyB-Vox_Skill1-1', volume: 3, at: 0.037, own: true }, { clip: 'Cast-04', volume: 2.8, at: 0.169 }, { clip: 'FreyB-Vox_Skill1-2', volume: 3, at: 1.472, own: true }, { clip: 'Impact-04', volume: 2.8, at: 1.67 }],
      blessing: [{ clip: 'Cast-05', volume: 2.8, at: 0.333 }, { clip: 'FreyB-Vox_Skill2-1', volume: 3, at: 0.333, own: true }, { clip: 'FreyB-Vox_Skill2-2', volume: 3, at: 1.266, own: true }, { clip: 'Impact-05', volume: 2.8, at: 1.718 }, { clip: 'FreyB-Vox_Skill2-3', volume: 3, at: 2.166, own: true }],
      vengeance: [{ clip: 'FreyB-Vox_Skill3', volume: 3, at: 0.02, own: true }, { clip: 'Cast-06', volume: 2.8, at: 0.126 }, { clip: 'Cast-07', volume: 2.8, at: 1.239 }],
    },
    victory: [{ clip: 'FreyB-Vox_Victory', volume: 3, at: 0.005, own: true }, { clip: 'Item-fx-01', volume: 2.5, at: 1.033 }, { clip: 'Texture-01', volume: 2.5, at: 1.933 }, { clip: 'Flap-03', volume: 2.5, at: 1.933 }, { clip: 'Kiss-01', volume: 2.5, at: 2.9 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    smite: { start: ['Skill.Hero.Frey.Fallen.Attack1.Casting'], land: ['Skill.Hero.Frey.Fallen.Attack1.Projectile', 'Skill.Hero.Frey.Fallen.Attack1.Hit'] },
    light: { start: ['Skill.Hero.Frey.Fallen.Skill1.Casting'], land: ['Skill.Hero.Frey.Fallen.Skill1.Hit'] },
    blessing: { start: ['Skill.Hero.Frey.Fallen.Skill2.Casting', 'Skill.Hero.Frey.Fallen.Skill2.Buff'] },
    vengeance: { start: ['Skill.Hero.Frey.Fallen.Skill3.Loop', 'Skill.Hero.Frey.Fallen.Skill3.Casting'], land: ['Skill.Hero.Frey.Fallen.Skill3.Hit'] },
  },
  skins: [
    {
      name: 'Fallen Frey',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Fallen_Frey.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Fallen_Frey.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Fallen_Frey.webp',
      // Her artwork, cut out of its white ground.
      portrait: { file: 'Fallen_Frey.png', crop: { x: 528, y: 72, size: 150 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Frey_Fallen_Vari05_Body', 'Hero_Frey_Fallen_Vari05_Hair'],
        // Her weapon, in her left hand: the only hand her file marks.
        left: 'Hero_Frey_Fallen_Vari05_Weapon',
        offHand: 'held',
      },
    },
    // King's Raid's Advance costume (tm-costumes.mjs).
    {
      name: 'Fallen_Frey_Advance',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Fallen_Frey_Advance.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Fallen_Frey_Advance.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Fallen_Frey_Advance.webp',
      title: 'Devotee of Nightmare Fallen Frey',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Frey_Fallen_Cos20Advance_Body', 'Hero_Frey_Fallen_Cos20Advance_Hair'],
        left: 'Hero_Frey_Fallen_Cos20Advance_Weapon',
        offHand: 'held',
      },
    },
  ],
};

import type { HeroAssets } from '../types.ts';

export const CLAUSE_ASSETS: HeroAssets = {
  name: 'Clause',
  folder: 'heroes/clause',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/14/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Guardian Shield's look: his own shield, held up before each hero it guards.
  props: { guardian: 'Hero_Clause_Vari05_Shield' },
  // His unique weapon, wielded: Exian, his sword and shield.
  unique: { Hero_Clause_Vari05_Shield: 'Hero_Clause_Unique01_Shield', Hero_Clause_Vari05_Sword: 'Hero_Clause_Unique01_Sword' },
  skins: [
    {
      name: 'Clause',
      portrait: { file: 'Clause.png', from: 'https://drive.google.com/uc?export=download&id=1bFANcAEYPRzphZmxGd79xgdvYFda-6ev', crop: { x: 612, y: 62, size: 160 } },
      model: {
        kind: 'parts',
        // His body, and his hair and helm (the folder with no more to its name).
        parts: ['Hero_Clause_Vari05_01_Body', 'Hero_Clause_Vari05'],
        left: 'Hero_Clause_Vari05_Shield',
        right: 'Hero_Clause_Vari05_Sword',
        blade: 'y',
        // Clause as Mixamo rigged him, as downloaded: read for how he stands, runs and attacks.
        movedBy: {
          kind: 'rigged',
          folder: 'Clause_Mixamo',
          idle: 'Clause - Sword And Shield Idle.fbx',
          run: 'Clause - Sword And Shield Run.fbx',
          // One slash where he stands. His sword hand is moving fastest 0.6 s in: the blow lands a little after, as the swing comes through.
          // Left just after it (before the clip's follow-through brings the sword down across him), easing back to his idle.
          attack: [{ file: 'Clause - Sword And Shield Slash.fbx', lands: [0.68], until: 0.8 }],
          // Guardian Shield: his shield arm raised high, then brought down to the ground (1.75 s in, where it lands), and up again.
          skills: { guard: { file: 'Clause - Sword And Shield Casting.fbx', lands: [1.75], until: 2.6 } },
        },
      },
    },
  ],
};

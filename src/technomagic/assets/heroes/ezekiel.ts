import type { HeroAssets } from '../types.ts';

/*
 * Ezekiel holds nothing: his weapon, Barbatos, is his demonic right arm, a part on his own skeleton (his body has
 * no right arm of its own), with the chains wound round it a part of its own. With no rig of his, he stands, runs
 * in and does the rest as ../../heroes/ezekiel/moves.ts has it.
 */

const DRIVE = 'https://drive.google.com/uc?export=download&id=';

export const EZEKIEL_ASSETS: HeroAssets = {
  name: 'Ezekiel',
  folder: 'heroes/ezekiel',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/37/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  skins: [
    {
      name: 'Ezekiel',
      // His artwork, lunging with his demon arm flung out: his head in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Ezekiel.png', from: `${DRIVE}1YnvFZjPQRrM40MH0gZrBU_lYrFu6t1pR`, crop: { x: 320, y: 200, size: 190 }, head: { x: 350, y: 240, size: 120 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Ezekiel_Vari05_Mesh', 'Hero_Ezekiel_Vari05_Weapon', 'Hero_Ezekiel_Vari05_Arm'],
      },
    },
    // His Halloween costume: a wolf's ears and tail, with its own arm and chains.
    {
      name: 'Ezekiel_Halloween',
      portrait: { file: 'Ezekiel_Halloween.png', from: `${DRIVE}1b1DtYAIpUJij08QrDdNpi_tZIPRHyq79`, crop: { x: 510, y: 50, size: 180 }, head: { x: 545, y: 90, size: 110 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Ezekiel_Cos18Halloween_Mesh', 'Hero_Ezekiel_Cos18Halloween_Weapon', 'Hero_Ezekiel_Cos18Halloween_Arm'],
      },
    },
  ],
};

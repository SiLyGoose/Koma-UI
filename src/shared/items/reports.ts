import { el } from './items';

/*
 * King's Raid's Technomagic Experiment Report (its TECHNOMAGIC_MATERIAL_PROMOTION): what Technomagic Restoration takes to make a 5★
 * TechnoMagic piece a 0★ Reclaimed one (the forge's Restore Gear: 40 of them and 10,000 zeiucoins, King's Raid's), dropped now and
 * then by the TechnoMagic Raid from stage 4 (the bot's constants/technomagic.ts TM_REPORTS), held in Others. Its picture is
 * King's Raid's own (NguiAtlas_Icon_Item_Material1 TECHNOMAGIC_MATERIAL_PROMOTION).
 */

export const REPORT_NAME = 'Technomagic Experiment Report';

/** Its name for `count` of them: "Technomagic Experiment Reports" past one. */
export const reportsName = (count: number): string => (count === 1 ? REPORT_NAME : `${REPORT_NAME}s`);

/** So many of them, in a few words: "1 Technomagic Experiment Report", "40 Technomagic Experiment Reports". */
export const reportCount = (count: number): string => `${count.toLocaleString('en-US')} ${reportsName(count)}`;

export const REPORT_PICTURE = '/kr/items/TECHNOMAGIC_MATERIAL_PROMOTION.webp';

/** What they are for, as Others and a drop's tile say it. */
export const REPORT_ABOUT =
  'From TechnoMagic Raid wins now and then from stage 4 (more often, and more of them, the higher the stage), and their Dispatch Battle Loot. The forge’s Restore Gear spends 40 of them, with 10,000 zeiucoins, restoring a 5★ TechnoMagic piece into a 0★ Reclaimed one (King’s Raid’s Technomagic Restoration): its main stat higher, its substats and additional effect kept.';

/** Its picture as an <img> (`className` its class); `named`: named for the reader, to stand beside a number. */
export function reportPicture(className = '', named = false): HTMLImageElement {
  const img = el('img', className);
  img.src = REPORT_PICTURE;
  img.alt = named ? reportsName(2) : '';
  if (named) img.title = reportsName(2);
  img.draggable = false;
  return img;
}

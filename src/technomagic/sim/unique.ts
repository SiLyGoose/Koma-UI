import { fine, pct, type Buff } from './shown';

/*
 * The heroes' unique weapons, as the fight has them: a hero wearing its own (the bot says how far it is
 * refined, R1 to R5, as the fight begins: its tier, 1 to 5) has its weapon's effect, on itself alone. ./fight.ts
 * applies them. Each is King's Raid's (kingsraid.shodyra.com, its 1★ to 5★; its 0★ is left out), but only for the
 * hero wielding it:
 *
 * - Klaus, The Guardian, Exian: every third skill he uses, every ally's P.DEF and ATK are higher for a while (the ATK of
 *   the ally with the highest ATK twice over).
 * - Kirze, Judgment Edge, Elicipira: each of her blows (her attack's and her skills') may deal more, a share
 *   of her ATK, twice over against a boss; her curse's burst is the harder for each stack of [Arcane Crystal Energy], and
 *   Bloom, Crimson Flower! lands on every enemy. (Her part does the burst: ./heroes/kirze.ts; the fight, the reach.)
 * - Fallen Frey, Angel's Despair, Rosmerta: each skill she uses heals the two allies with the highest ATK (her too, if
 *   she is one), and they see past more of the boss's defense for a while; and Dark Lord Kasel, with her, is quicker.
 * - Gremory, Gateway to Purgatory, Pigritia: she is quicker; each time she sleeps she is healed and her mana
 *   filled a share over 2 seconds, and her Mana Charge raises her ATK more. (Her part does it: ./heroes/gremory.ts.)
 * - Annette, Crystallized Technomagic, Rascal: every so often she gains a Charge (even while Overcharged) and a
 *   little mana; and while she is Overcharged every ally deals more and takes less, twice as much for the ally with
 *   the highest ATK. (Her part does it: ./heroes/annette.ts.)
 * - Laias, Flowing Circle, Eltoirre: healing reaches every ally the more, their M.DEF higher by a share of her ATK, and
 *   every 5 seconds the ally with the lowest health is healed. (Her part does it: ./heroes/laias.ts.)
 * - Seria, Executioner of Domains, Elsion: a critical blow of her skills deals more, leaves the boss healed less for a
 *   while, and her healed more (up to 5 times over). (Her part does it: ./heroes/seria.ts.)
 * - Morrah, Flame of Victory, Carprain: now and then a blow of her attack leaves the boss hitting less hard and
 *   taking more magic damage for a while, twice as much more with her Flame stacked full on it. (Her part does it: ./heroes/morrah.ts.)
 * - Ezekiel, Jailer of Despair, Barbatos: his Fury lasts longer, and while it does his critical blows are harder and
 *   he stands being knocked down better. (His part does it: ./heroes/ezekiel.ts.)
 * - Lorraine, World Tree's Will, Roburu: every 7 seconds, with her Poison on the boss, a blow that leaves its M.DEF lower
 *   and it taking more magic damage for a while. (Her part does it: ./heroes/lorraine.ts.)
 * - Valance, Wonder of Magos Le'Flamme, Corbeau Rose: every ally gains by the TechnoMagic gear it wears. (Her part does
 *   it: ./heroes/valance.ts.)
 * - Lucikiel, Form of Ultimate Destruction, Barbatos Gigante: every 10 of his blows a stack of Incarnation of Doom (up
 *   to 10), each his ATK and attack speed higher; at 10, each blow of his deals more through the boss's defense. (His part
 *   does it: ./heroes/lucikiel.ts.)
 * - Selene, Green Winds, Notos: a critical blow quickens her for a while, and meanwhile her attack shoots an arrow
 *   more. (Her part does it: ./heroes/selene.ts.)
 * - Crow, Hellhound, Akistra: his attack shoots a bullet more, and a skill of his raises his ATK and crit damage for a
 *   while, no sooner than that while after the last. (His part does it: ./heroes/crow.ts.)
 * - Oddy, Moonshade Countdown, Tempodiana: her Time Distortion takes more off every ally's cooldowns, and raises their
 *   ATK for a while. (Her part does it: ./heroes/oddy.ts.)
 * - Phillop, Dragon's Ruins, Atein: hurt by the boss, every other ally's defense is higher a moment, and he gains a
 *   stack of Dragon Rage (up to 100, for a while), each his ATK and defense higher. (His part does it: ./heroes/phillop.ts.)
 * - Naila, Cursed Claws, Baroro: a critical blow of hers leaves its target taking more physical damage and with less CC
 *   resist for a while, and on the boss a stack on her (up to 10), each her DMG higher. (Her part does it: ./heroes/naila.ts.)
 * - Yanne, Dragonbane, Svelta: a critical blow of hers deals more and gains her mana (on a Dragon Raid's dragon, a blow
 *   more again and a stun), no sooner than a moment after the last. (Her part does it: ./heroes/yanne.ts.)
 * - Neraxis, Roaring Dragonmaw, Acravita: every so many blows of his attack a blow more that stuns 2 enemies at random a moment,
 *   and the Storm of Neraxis for a while: every ally's defense higher by a share of his, and its ATK higher. (His part
 *   does it: ./heroes/neraxis.ts.)
 * - Erze, Essence of Greed, Perion: each blow of her skills a stack (up to so many, for a while), each her ATK and
 *   attack speed higher. (Her part does it: ./heroes/erze.ts.)
 * - Loman, Wave of Protection, Gaiamenes: every 3rd skill of his a blow that leaves the boss taking more physical
 *   damage, and his M.DEF higher for a while. (His part does it: ./heroes/loman.ts.)
 * - Gau, Holy Bird, Numinu: his max HP higher (here: taking that much less), and now and then a blow of his attack
 *   deals more and freezes the boss. (His part does it: ./heroes/gau.ts.)
 * - Tanya, Demon of the Calm, Caethasis: in Stealth from the start, and untouched for a moment; her crit damage higher
 *   for a while each time she goes into Stealth. (Her part does it: ./heroes/tanya.ts.)
 * - Rebel Klaus, Adversary of the Goddess, Galicta: his penetration higher; each skill he uses costs him a share of his
 *   HP, and gives him a stack (up to so many, for a while), each his DMG higher. (His part does it: ./heroes/rebel-klaus.ts.)
 * - Dark Lord Kasel, Corrupted Holy Sword, Aea: each blow of his leaves the boss healed less for a while (up to so many
 *   times over), and may deal a blow more. (His part does it: ./heroes/dark-lord-kasel.ts.)
 * - Theo, Lightning Bolt, Legios: each of his blows a stack of Lightning; at 50, his attack speed, crit DMG and penetration
 *   higher for a while (none stacked meanwhile).
 * - Priscilla, Tumultuous Dance, Excilius: each blow of Vital Strike and Turbulent Dance takes time off that skill's
 *   cooldown, and quickens her (up to 10 times).
 * - Glenwys, The Counterattack, Maxithea: each skill she uses raises every ally's ATK and crit DMG (up to 4 times, twice
 *   that at 4), for good.
 * - Chase, Blood Lancer Monolith: his crit DMG higher; each part of his attack a blow of flame more that heals him (twice
 *   under [Remove Limit]).
 * - Aselica, Solar Halo, Ignisius: every 5 blows of her attack, the boss takes more magic damage for a while and is
 *   stunned a moment.
 * - Lakrak, Lakrak MK-1: an [Experiment] likelier to succeed, and each success a stack (up to 4), each his ATK, attack
 *   speed and DMG to Non-Hero enemies higher.
 * - Miruru, Ultimate Weapon, Leviathan: each shell of Boooooom! may deal a blow more and leave the boss taking more physical
 *   damage for a while.
 * - Mirianne, Endless Acceleration, Riventina: quicker; her blows on an enemy under [Target Lock On] deal a blow more,
 *   every 2 seconds at most.
 * - Kara, 0-Form Perpetual Motion Cannon, Heaven Shatterer: her ATK higher every second, up to so many times.
 * - Zafir, Glory of the God King, Zaries: each skill he uses a stack of [Will of Desert] (up to 8), each his ATK and crit
 *   DMG higher for a while.
 * - Pansirone, Roar of Raging Heat, Tersia: each of her blows on an enemy in [Eternal Blaze] raises her ATK, DEF and the
 *   blaze's damage (up to 20 times).
 * - Isolet, Conqueror of Darkness, Del Terravion: every 10 seconds the boss takes more physical damage for a while, and her
 *   DMG is higher (up to 6 times).
 * - Lilia, Infinite Spring, Cielamaha: her mana fills by so much more every second, and each part of her attack may deal a
 *   blow more.
 * - Lucias, Blessing of Light, Benedicia: for the fight's first seconds, every ally takes less physical damage, is quicker
 *   and deals more to Non-Hero enemies.
 * - Rehartna, Anthem of a New Road, Matimaruma: every 3 skills she uses, what the boss left on every ally is cleared, and
 *   they take less for a while.
 * - Shea, Charming Melody, Schwanheite: her CC resist higher; each stack of [Blissful Performance] takes a share off her
 *   cooldowns and gains her mana.
 * - Lavril, Void Soul, Dunn Nemecia: each skill she uses, untouched for a moment (no more often than every 10 seconds);
 *   her [Soul Link]'s ally's crit DMG higher.
 * - Evan, Small Synthesized Darkness, Naav Gehen: each skill he uses gains him mana, and for a moment every ally takes less
 *   physical damage and the boss more.
 * - Estelle, Chant of Tailwinds, Stosmos: [Adventure Guide] the longer, and every ally's ATK higher meanwhile.
 * - Jane, Unchanging Mind, Erekura: every second a blow on the enemies near her, hitting less hard a moment; the ally with
 *   the highest ATK (not her) deals more to Non-Hero enemies; and her [Coffin] fills a share of her mana.
 *   (Each of these, the hero's part does it: ./heroes/<hero>.ts.)
 *
 * The game's shares of ATK are as they are for damage (this raid's blows are counted in thousandths of them: ./combat/),
 * and for a heal (a share of ATK: its hero's health and attack are the game's own, so it mends as much as there).
 */

/** Each weapon's numbers at its stars, 0★ to 5★ (the index is its stars: King's Raid's, kingsraid.shodyra.com's). */
/** Every so many skills of his: every ally's P.DEF and ATK higher (shares) for `lasts` seconds, the ATK `top` times that for the ally with the highest ATK. */
export const EXIAN = { name: 'The Guardian, Exian', every: 3, lasts: 15, defense: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], atk: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], top: 2 };
/**
 * Kirze's: the chance a blow has, its blow more (at ATK), the more against a boss; how much more each stack of [Arcane Crystal
 * Energy] makes her curse's burst (King's Raid's says only that it amplifies them: this raid's own), and how far about its
 * target [Bloom, Crimson Flower!] lands with it (every enemy: King's Raid's says only that it greatly widens it).
 */
export const ELICIPIRA = { name: 'Judgment Edge, Elicipira', chance: 0.04, boss: 2, blow: [5000, 6000, 7200, 8600, 10000, 12500], crystals: 0.5, reach: Infinity };
/**
 * How many allies it reaches (those with the highest ATK), how long, and its heal (a share of her ATK) and penetration; and
 * Dark Lord Kasel's ATK Spd (points), with her. Its 5★ is King's Raid's as the user has it (140%, +200); below that,
 * shodyra's steps scaled down to it (Dark Lord Kasel's the same as the penetration, as King's Raid's are).
 */
export const ROSMERTA = { name: 'Angel’s Despair, Rosmerta', allies: 2, lasts: 7, heal: [0.54, 0.66, 0.82, 0.97, 1.17, 1.4], pen: [80, 96, 116, 140, 168, 200], kasel: [80, 96, 116, 140, 168, 200] };
/** Its attack speed (points), its heal and mana on sleeping (shares of her max HP and max mana, the mana over `over` seconds), and the ATK each Mana Charge adds. */
export const PIGRITIA = {
  name: 'Gateway to Purgatory, Pigritia',
  speed: [200, 240, 290, 350, 420, 500],
  heal: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5],
  mana: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5],
  over: 2,
  charge: [0.04, 0.048, 0.058, 0.07, 0.084, 0.1],
};
/** How often it gives her a Charge and a share of her max mana (seconds), and what every ally deals more and takes less while she is Overcharged (`top` times that for the ally with the highest ATK). */
export const RASCAL = { name: 'Crystallized Technomagic, Rascal', every: [1.5, 1.4, 1.3, 1.1, 0.9, 0.7], mana: 0.01, dmg: [0.02, 0.024, 0.029, 0.035, 0.042, 0.05], taken: [0.02, 0.024, 0.029, 0.035, 0.042, 0.05], top: 2 };
/** The chance a blow of her attack has, how long what it leaves on the boss lasts (seconds), and how much less hard it hits and more magic damage it takes (`full` times that more with her Flame stacked full on it). */
export const CARPRAIN = { name: 'Flame of Victory, Carprain', chance: 0.2, lasts: 10, weaker: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], full: 2 };
/** A critical skill blow's blow more (at ATK), what it takes off the boss's heals for `lasts` seconds, and what each of its stacks (up to `most`, for `healed` seconds) adds to hers. */
export const ELSION = { name: 'Executioner of Domains, Elsion', blow: [500, 600, 720, 860, 1030, 1250], unhealed: [0.24, 0.29, 0.35, 0.42, 0.5, 0.6], lasts: 5, heals: [0.04, 0.05, 0.06, 0.07, 0.09, 0.1], most: 5, healed: 20 };
/** How much more healing reaches every ally, and their M.DEF higher by a share of her ATK; how often (seconds) the ally with the lowest health is healed, and by how much (a share of her ATK). */
export const ELTOIRRE = { name: 'Flowing Circle, Eltoirre', heals: [0.08, 0.1, 0.12, 0.14, 0.17, 0.2], defense: 0.05, every: 5, mend: [1, 1.2, 1.4, 1.7, 2.1, 2.5] };
/** How many seconds longer his Fury lasts, and what it adds to his crit damage (a share more) and CC resist (points) while it does. */
export const BARBATOS = { name: 'Jailer of Despair, Barbatos', longer: [2, 3, 4, 5, 6, 7], critDamage: [0.8, 0.9, 1, 1.1, 1.2, 1.3], resist: [200, 240, 290, 350, 420, 500] };
/** How often (seconds) it strikes a poisoned boss, how hard (at ATK), and how much lower its M.DEF and more magic damage it takes after, for `lasts` seconds. */
export const ROBURU = { name: 'World Tree’s Will, Roburu', every: 7, blow: [1000, 1200, 1400, 1700, 2100, 2500], defense: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 };

/** How many blows gain him a stack, the most stacks, what each adds to his ATK (a share) and attack speed (points), and at the most his blows' blow more (at ATK, through the boss's defense). */
export const GIGANTE = { name: 'Form of Ultimate Destruction, Barbatos Gigante', blows: 10, most: 10, atk: [0.04, 0.048, 0.058, 0.07, 0.084, 0.1], speed: [20, 24, 29, 35, 42, 50], blow: [300, 360, 430, 520, 630, 750] };
/** Her attack speed (points) after a critical blow, for `lasts` seconds, and meanwhile the arrow more each attack shoots (at ATK). */
export const NOTOS = { name: 'Green Winds, Notos', lasts: 10, speed: [200, 240, 280, 340, 410, 500], arrow: [1000, 1200, 1400, 1700, 2100, 2500] };
/** The bullet more his attack shoots (at ATK); and after a skill his ATK and crit damage higher (shares) for `lasts` seconds, no sooner than `every` after the last. */
export const AKISTRA = { name: 'Hellhound, Akistra', bullet: [500, 600, 700, 850, 1000, 1250], boost: [0.3, 0.36, 0.43, 0.52, 0.62, 0.75], lasts: 20, every: 20 };
/** How many seconds more her Time Distortion takes off every ally's cooldowns, and their ATK higher (a share) for `lasts` seconds. */
export const TEMPODIANA = { name: 'Moonshade Countdown, Tempodiana', cooldown: [2, 3, 4, 5, 6, 7], atk: [0.14, 0.17, 0.21, 0.25, 0.3, 0.35], lasts: 10 };
/** Every other ally's defense higher (a share) for `guards` seconds; and a stack of Dragon Rage (up to `most`, for `lasts` seconds), each his ATK and defense higher. */
export const ATEIN = { name: 'Dragon’s Ruins, Atein', defense: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], guards: 3, rage: [0.008, 0.01, 0.012, 0.014, 0.017, 0.02], most: 100, lasts: 10 };
/**
 * A critical blow: for `lasts` seconds its target takes more physical damage and has less CC resist (points); and on a boss, a
 * stack on her (up to `most`, for as long), each her DMG higher.
 */
export const BARORO = { name: 'Cursed Claws, Baroro', lasts: 10, takes: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], resist: [200, 240, 290, 350, 420, 500], boss: [0.02, 0.024, 0.029, 0.035, 0.042, 0.05], most: 10 };

/** What a critical blow of hers deals more (at ATK) and the mana it gains her; on a dragon, a blow more again (at ATK) and a stun; no sooner than `every` seconds after the last. */
export const SVELTA = { name: 'Dragonbane, Svelta', blow: [500, 600, 720, 860, 1030, 1250], mana: 150, dragon: [800, 960, 1150, 1380, 1660, 2000], stun: 1.5, every: 0.5 };
/** How many blows of his attack bring it on; its blow (at ATK) and stun, on so many enemies at random; and the Storm of Neraxis for `lasts` seconds: every ally's defense higher by a share of his, and its ATK (a share). */
export const ACRAVITA = { name: 'Roaring Dragonmaw, Acravita', blows: [20, 19, 18, 17, 16, 15], blow: 1000, stun: 0.5, enemies: 2, lasts: 10, defense: [0.04, 0.048, 0.057, 0.069, 0.083, 0.1], atk: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25] };
/** What each stack adds to her ATK (a share) and attack speed (points), for `lasts` seconds, up to `most`. */
export const PERION = { name: 'Essence of Greed, Perion', atk: 0.005, speed: 5, lasts: 30, most: [80, 90, 110, 130, 160, 200] };
/** Every `skills` skills of his: a blow (at ATK), the boss taking more physical damage for `lasts` seconds, and his M.DEF higher (a share) for `guards`. */
export const GAIAMENES = { name: 'Wave of Protection, Gaiamenes', skills: 3, blow: [2000, 2400, 2900, 3500, 4200, 5000], weakness: [0.25, 0.3, 0.36, 0.43, 0.51, 0.6], lasts: 20, defense: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], guards: 10 };
/** His max HP higher (a share: here, taking that much less); and how likely a blow of his attack is to deal more (at ATK) and freeze the boss for `freeze` seconds. */
export const NUMINU = { name: 'Holy Bird, Numinu', hp: [0.12, 0.14, 0.17, 0.21, 0.25, 0.3], chance: 0.15, blow: [2000, 2400, 2900, 3500, 4200, 5000], freeze: 2 };
/** In Stealth for `lasts` seconds from the start, untouched for the first so many; and each time she goes into Stealth, her crit damage higher (a share) for `boosted` seconds. */
export const CAETHASIS = { name: 'Demon of the Calm, Caethasis', lasts: 10, untouched: [2, 2.4, 2.9, 3.5, 4.2, 5], critDamage: [0.3, 0.36, 0.43, 0.52, 0.62, 0.75], boosted: 10 };
/** His penetration more (points); the share of his current HP each skill costs him, and the DMG each stack adds (a share), for `lasts` seconds, up to `most`. */
export const GALICTA = { name: 'Adversary of the Goddess, Galicta', pen: [200, 240, 290, 350, 420, 500], hp: 0.2, dmg: [0.02, 0.024, 0.029, 0.035, 0.042, 0.05], lasts: 30, most: 5 };
/** How much less each of his blows leaves the boss healed (a share) for `lasts` seconds, up to `most` times over; and how likely each is to deal a blow more (at ATK). */
export const AEA = { name: 'Corrupted Holy Sword, Aea', heals: [0.01, 0.012, 0.014, 0.017, 0.021, 0.025], lasts: 10, most: 12, chance: 0.35, blow: [1000, 1200, 1400, 1700, 2100, 2500] };
/** Theo's: the stacks it takes, how long it lasts; attack speed, crit DMG and penetration. */
export const LEGIOS = { name: 'Lightning Bolt, Legios', stacks: 50, lasts: 15, speed: [300, 360, 430, 520, 620, 750], critDamage: [1, 1.2, 1.44, 1.73, 2.08, 2.5], pen: [300, 360, 430, 520, 620, 750] };
/** Priscilla's: seconds off the skill's cooldown; attack speed for each stack, for how long, up to how many. */
export const EXCILIUS = { name: 'Tumultuous Dance, Excilius', sooner: [1, 1.2, 1.4, 1.7, 2, 2.5], speed: 50, lasts: 5, most: 10 };
/** Glenwys's: up to how many; each one's ATK and crit DMG (shares). */
export const MAXITHEA = { name: 'The Counterattack, Maxithea', most: 4, atk: [0.01, 0.012, 0.014, 0.017, 0.02, 0.025], critDamage: [0.02, 0.024, 0.028, 0.034, 0.042, 0.05] };
/** Chase's: crit DMG; its flame (a share of ATK), and the share of it that heals him. */
export const MONOLITH = { name: 'Blood Lancer Monolith', critDamage: [0.2, 0.24, 0.28, 0.34, 0.42, 0.5], flame: [0.3, 0.36, 0.43, 0.52, 0.62, 0.75], heal: 0.2 };
/** Aselica's: every how many blows; the boss's more magic damage taken, for how long; its stun. */
export const IGNISIUS = { name: 'Solar Halo, Ignisius', every: 5, takes: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], lasts: 10, stun: 0.5 };
/** Lakrak's: what it adds to an [Experiment]'s chance of success; on each success a stack, up to how many, each his ATK, attack speed and more to Non-Hero enemies. */
export const MK1 = { name: 'Lakrak MK-1', success: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], most: 4, atk: [0.06, 0.072, 0.086, 0.105, 0.125, 0.15], speed: [60, 72, 86, 105, 125, 150], boss: [0.06, 0.072, 0.086, 0.105, 0.125, 0.15] };
/** Miruru's: its chance, its blow (a share of ATK); the boss's more physical damage taken, for how long. */
export const LEVIATHAN = { name: 'Ultimate Weapon, Leviathan', chance: 0.5, blow: [1, 1.2, 1.4, 1.7, 2.1, 2.5], takes: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], lasts: 10 };
/** Mirianne's: attack speed; its blow (a share of ATK), every how many seconds at most. */
export const RIVENTINA = { name: 'Endless Acceleration, Riventina', speed: [200, 240, 290, 350, 420, 500], blow: [2, 2.4, 2.9, 3.5, 4.2, 5], every: 2 };
/** Kara's: ATK each second, up to how many. */
export const SHATTERER = { name: '0-Form Perpetual Motion Cannon, Heaven Shatterer', atk: 0.02, most: [15, 20, 25, 30, 35, 40] };
/** Zafir's: each stack's ATK and crit DMG, up to how many, for how long. */
export const ZARIES = { name: 'Glory of the God King, Zaries', boost: [0.04, 0.048, 0.056, 0.068, 0.084, 0.1], most: 8, lasts: 30 };
/** Pansirone's: each stack's ATK, DEF and the blaze's more, up to how many. */
export const TERSIA = { name: 'Roar of Raging Heat, Tersia', boost: [0.01, 0.012, 0.014, 0.017, 0.021, 0.025], most: 20 };
/** Isolet's: every how many seconds; the boss's more physical damage taken, for how long; her DMG for each, up to how many. */
export const TERRAVION = { name: 'Conqueror of Darkness, Del Terravion', every: 10, takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 12, dmg: [0.02, 0.024, 0.029, 0.035, 0.042, 0.05], most: 6 };
/** Lilia's: mana every second; its chance, and its blow (a share of ATK). */
export const CIELAMAHA = { name: 'Infinite Spring, Cielamaha', mana: [50, 60, 70, 85, 105, 125], chance: 0.8, blow: [0.2, 0.24, 0.28, 0.34, 0.42, 0.5] };
/** Lucias's: for how long; physical damage less, attack speed, more to Non-Hero enemies. */
export const BENEDICIA = { name: 'Blessing of Light, Benedicia', lasts: 30, taken: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], speed: [100, 120, 140, 170, 210, 250], boss: [0.08, 0.1, 0.12, 0.14, 0.17, 0.2] };
/** Rehartna's: every how many skills; damage less, for how long. */
export const NEW_ROAD = { name: 'Anthem of a New Road, Matimaruma', skills: 3, taken: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 };
/** Shea's: CC resist; for each stack, the share off her cooldowns and the mana. */
export const SCHWANHEITE = { name: 'Charming Melody, Schwanheite', resist: [300, 360, 430, 520, 630, 750], sooner: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], mana: [400, 480, 580, 700, 840, 1000] };
/** Lavril's: how long untouched, no more often than; her linked ally's crit DMG. */
export const NEMECIA = { name: 'Void Soul, Dunn Nemecia', untouched: [1, 1.2, 1.4, 1.7, 2.1, 2.5], every: 10, critDamage: [0.3, 0.36, 0.42, 0.51, 0.63, 0.75] };
/** Evan's: mana; every ally's physical damage less and the boss's more, for how long. */
export const NAAV = { name: 'Small Synthesized Darkness, Naav Gehen', mana: [400, 480, 580, 700, 840, 1000], taken: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 5 };
/** Estelle's: [Adventure Guide]'s more seconds; every ally's ATK meanwhile. */
export const STOSMOS = { name: 'Chant of Tailwinds, Stosmos', longer: [1, 2, 3, 4, 5, 6], atk: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25] };
/** Jane's: its blow every second (a share of ATK) on the enemies within so far, their ATK less a moment; the ally with the highest ATK's more to Non-Hero enemies; the [Coffin]'s mana (a share). */
export const EREKURA = { name: 'Unchanging Mind, Erekura', blow: [0.1, 0.12, 0.14, 0.17, 0.2, 0.25], reach: 6.6, weaker: [0.14, 0.17, 0.2, 0.24, 0.29, 0.35], boss: [0.06, 0.07, 0.08, 0.1, 0.12, 0.15], mana: 0.3 };

/** What every ally gains by the TechnoMagic gear it wears: 1 piece, more ATK; 2, more defense; 3, more max HP (here: taking that much less); 4, more DMG. */
export const CORBEAU = {
  name: 'Wonder of Magos Le’Flamme, Corbeau Rose',
  atk: [0.06, 0.072, 0.086, 0.104, 0.126, 0.15],
  defense: [0.06, 0.072, 0.086, 0.104, 0.126, 0.15],
  hp: [0.06, 0.072, 0.086, 0.104, 0.126, 0.15],
  dmg: [0.04, 0.048, 0.058, 0.07, 0.084, 0.1],
};

/** The most stars a weapon (or a treasure) is awakened to: its tiers are 0★ to this. */
export const TIERS = 5;

/**
 * A tier's (its stars') number from a weapon's or treasure's list: a list of six is its 0★ to 5★; a list of five, its 1★ to
 * 5★ (0★ as 1★). Out of range: the nearest.
 */
export const atTier = (list: readonly number[], tier: number): number => {
  const star = Math.min(TIERS, Math.max(0, Math.floor(tier)));
  return list[Math.max(0, Math.min(list.length - 1, list.length > TIERS ? star : star - 1))] as number;
};

/**
 * What each hero's weapon does at a tier, as its card and the heroes page say it: King's Raid's own words (krinfo.net's, the
 * game as it was last), but with this raid's numbers, and only what this raid has it do. What is the hero's own (a stack, a
 * mark only it has: Annette's Charge) is *between asterisks* (Discord's italics; the site's own colour: ../../shared/heroes.ts
 * skillText); a state of the hero's is named as King's Raid's are ("[Overcharge] state", "Fury state").
 */
const ABOUT: Readonly<Record<string, (tier: number) => string>> = {
  klaus: (tier) =>
    `After using own active Skill ${EXIAN.every} times, increases all allies' P.DEF by ${fine(atTier(EXIAN.defense, tier))} and ATK by ${fine(atTier(EXIAN.atk, tier))} for ${EXIAN.lasts} sec. The ATK Boost effect multiplies by ${EXIAN.top} for the ally with the highest ATK.`,
  kirze: (tier) =>
    `Amplifies the power of *Arcane Crystals*: each stack of [Arcane Crystal Energy] deals ${fine(ELICIPIRA.crystals)} more DMG. Greatly increases the effect range of [Bloom, Crimson Flower!], reaching all enemies. Normal and Skill attacks have a ${fine(ELICIPIRA.chance)} chance to deal additional M.DMG equal to ${fine(atTier(ELICIPIRA.blow, tier) / 1000)} of ATK. DMG is increased by ${ELICIPIRA.boss} times against Bosses.`,
  'fallen-frey': (tier) =>
    `Upon using a Skill, heals HP of ${ROSMERTA.allies} allies with the highest ATK equal to ${fine(atTier(ROSMERTA.heal, tier))} of Fallen Frey's ATK and increases DEF Penetration by ${atTier(ROSMERTA.pen, tier)} for ${ROSMERTA.lasts} sec. If [Dark Lord Kasel] is an ally, increases ATK Spd of [Dark Lord Kasel] by ${atTier(ROSMERTA.kasel, tier)}.`,
  gremory: (tier) =>
    `Increases ATK Spd by ${atTier(PIGRITIA.speed, tier)}. Upon using [Eh, whatever. I’m gonna sleep.], Gremory heals HP equal to ${fine(atTier(PIGRITIA.heal, tier))} of her Max HP and recovers Mana by ${fine(atTier(PIGRITIA.mana, tier))} over ${PIGRITIA.over} sec. Each stack of *Mana Charge* increases ATK by an additional ${fine(atTier(PIGRITIA.charge, tier))}.`,
  annette: (tier) =>
    `Gains 1 stack of *Charge* every ${atTier(RASCAL.every, tier)} sec, and recovers Mana by ${fine(RASCAL.mana)}. *Charge* stacks can also be gained during the [Overcharge] state. Additionally, increases all allies' DMG dealt to Bosses by ${fine(atTier(RASCAL.dmg, tier))} and reduces DMG all allies take by ${fine(atTier(RASCAL.taken, tier))} for the duration of [Overcharge]. This effect is multiplied by ${RASCAL.top} for the ally with the highest ATK.`,
  laias: (tier) =>
    `Increases the Heal Rate of all allies by ${fine(atTier(ELTOIRRE.heals, tier))} and M.DEF by ${fine(ELTOIRRE.defense)} of Laias's ATK. Every ${ELTOIRRE.every} sec, heals the ally with the lowest HP by ${fine(atTier(ELTOIRRE.mend, tier))} of own ATK.`,
  seria: (tier) =>
    `Upon a Crit Skill Hit, deals additional M.DMG equal to ${fine(atTier(ELSION.blow, tier) / 1000)} of ATK. Hit target has its Heal Rate reduced by ${fine(atTier(ELSION.unhealed, tier))} for ${ELSION.lasts} sec and increases own Heal Rate by ${fine(atTier(ELSION.heals, tier))} for ${ELSION.healed} sec. The Heal Rate Boost effect can be stacked up to max ${ELSION.most} times and is irremovable.`,
  morrah: (tier) =>
    `Normal attacks have a ${fine(CARPRAIN.chance)} chance to reduce ATK of the target by ${fine(atTier(CARPRAIN.weaker, tier))} and cause the target to take ${fine(atTier(CARPRAIN.weaker, tier))} increased M.DMG for ${CARPRAIN.lasts} sec. If the target has 100 or more stacks of *Flame*, M.DMG boost is multiplied by ${CARPRAIN.full}.`,
  ezekiel: (tier) =>
    `Increases the duration of [Fury] by ${atTier(BARBATOS.longer, tier)} sec. While in [Fury] state, increases Crit DMG by ${fine(atTier(BARBATOS.critDamage, tier))} and CC Resist by ${atTier(BARBATOS.resist, tier)}.`,
  lorraine: (tier) =>
    `Deals M.DMG equal to ${fine(atTier(ROBURU.blow, tier) / 1000)} of ATK to enemies inflicted with *Poison* every ${ROBURU.every} sec, reducing M.DEF by ${fine(atTier(ROBURU.defense, tier))} and increasing M.DMG the target takes by ${fine(atTier(ROBURU.takes, tier))} for ${ROBURU.lasts} sec.`,
  valance: (tier) =>
    `The following buffs are applied to the target based on the number of TechnoMagic Gear equipped to each ally. 1 Part: Increases ATK by ${fine(atTier(CORBEAU.atk, tier))}. 2 Parts: Increases All DEF by ${fine(atTier(CORBEAU.defense, tier))}. 3 Parts: Increases Max HP by ${fine(atTier(CORBEAU.hp, tier))}. 4 Parts: Increases DMG dealt to enemies by ${fine(atTier(CORBEAU.dmg, tier))}.`,
  lucikiel: (tier) =>
    `Gains a stack of *[Incarnation of Doom]* upon attacking an enemy ${GIGANTE.blows} times. Each stack of *[Incarnation of Doom]* increases ATK by ${fine(atTier(GIGANTE.atk, tier))} and ATK Spd by ${atTier(GIGANTE.speed, tier)}. This effect can be stacked up to max ${GIGANTE.most} times and is irremovable. At ${GIGANTE.most} stacks of *[Incarnation of Doom]*, Lucikiel's normal and Skill attacks deal additional M.DMG that ignores DEF equal to ${fine(atTier(GIGANTE.blow, tier) / 1000)} of his ATK to a target.`,
  selene: (tier) =>
    `Upon a Crit Hit, ATK Spd is increased by ${atTier(NOTOS.speed, tier)} for ${NOTOS.lasts} sec, and for the duration, each auto attack fires an arrow that deals extra P.DMG equal to ${fine(atTier(NOTOS.arrow, tier) / 1000)} of ATK.`,
  crow: (tier) =>
    `The normal attack shoots an additional bullet that deals ${fine(atTier(AKISTRA.bullet, tier) / 1000)} of ATK as P.DMG. When the skill ends, 'Hellhound, Akistra' is activated, increasing ATK and Crit DMG by ${fine(atTier(AKISTRA.boost, tier))} for ${AKISTRA.lasts} sec. 'Hellhound, Akistra' is only activated once every ${AKISTRA.every} sec.`,
  oddy: (tier) =>
    `Upon using [Time Distortion], all allies' Skill Cooldown is reduced by an extra ${atTier(TEMPODIANA.cooldown, tier)} sec, and ATK is increased by ${fine(atTier(TEMPODIANA.atk, tier))} for ${TEMPODIANA.lasts} sec.`,
  phillop: (tier) =>
    `Upon taking DMG, increases All DEF of all allies except self by ${fine(atTier(ATEIN.defense, tier))} for ${ATEIN.guards} sec and stacks 1 *Dragon Rage* upon self. *Dragon Rage* can be stacked up to max ${ATEIN.most} times, and each stack increases own ATK and DEF by ${fine(atTier(ATEIN.rage, tier))} for ${ATEIN.lasts} sec.`,
  naila: (tier) =>
    `Upon a Critical Hit, increases P.DMG the target takes by ${fine(atTier(BARORO.takes, tier))} for ${BARORO.lasts} sec, and reduces its CC Resist by ${atTier(BARORO.resist, tier)}. If the target is a Boss, Naila deals ${fine(atTier(BARORO.boss, tier))} increased DMG. The DMG Boost effect against Bosses can be stacked up to max ${BARORO.most} times.`,
  yanne: (tier) =>
    `Upon a Crit Hit, deals additional P.DMG equal to ${fine(atTier(SVELTA.blow, tier) / 1000)} of ATK and recovers ${SVELTA.mana} Mana. If the target is a Dragon, deals additional P.DMG equal to ${fine(atTier(SVELTA.dragon, tier) / 1000)} of ATK and inflicts Stun for ${SVELTA.stun} sec. A ${SVELTA.every} sec Cooldown is applied to this effect.`,
  neraxis: (tier) =>
    `After landing ${atTier(ACRAVITA.blows, tier)} normal attacks, deals additional M.DMG equal to ${fine(ACRAVITA.blow / 1000)} of ATK to ${ACRAVITA.enemies} random enemies, inflicts Stun on them for ${ACRAVITA.stun} sec, and enters [Storm of Neraxis] state for ${ACRAVITA.lasts} sec. For the duration of [Storm of Neraxis], increases all allies' P.DEF equal to ${fine(atTier(ACRAVITA.defense, tier))} of own P.DEF, M.DEF equal to ${fine(atTier(ACRAVITA.defense, tier))} of own M.DEF, and ATK by ${fine(atTier(ACRAVITA.atk, tier))}.`,
  erze: (tier) =>
    `Each Skill hit increases own ATK by ${fine(PERION.atk)} and ATK Spd by ${PERION.speed} for ${PERION.lasts} sec. This effect can be stacked up to max ${atTier(PERION.most, tier)} times and is irremovable.`,
  loman: (tier) =>
    `*Pride of Orvelia* is stacked on every use of skills. When stacked ${GAIAMENES.skills} times, *Blessing of Orvelia* is activated, dealing ${fine(atTier(GAIAMENES.blow, tier) / 1000)} of ATK as P.DMG to the enemy and increasing P.DMG the target takes by ${fine(atTier(GAIAMENES.weakness, tier))} for ${GAIAMENES.lasts} sec. *Blessing of Orvelia* also increases own M.DEF by ${fine(atTier(GAIAMENES.defense, tier))} for ${GAIAMENES.guards} sec.`,
  gau: (tier) =>
    `Increases own Max HP by ${fine(atTier(NUMINU.hp, tier))}. Normal attacks have a ${fine(NUMINU.chance)} chance of dealing additional P.DMG equal to ${fine(atTier(NUMINU.blow, tier) / 1000)} of ATK and freezing the enemy for ${NUMINU.freeze} sec.`,
  tanya: (tier) =>
    `At the beginning of each battle, enters [Stealth] state for ${CAETHASIS.lasts} sec and dodges all attacks for ${atTier(CAETHASIS.untouched, tier)} sec. Every time Tanya enters [Stealth] state, her Crit DMG increases by ${fine(atTier(CAETHASIS.critDamage, tier))} for ${CAETHASIS.boosted} sec.`,
  'rebel-klaus': (tier) =>
    `Increases DEF Penetration by ${atTier(GALICTA.pen, tier)}. Upon every Skill use, consumes ${fine(GALICTA.hp)} of own current HP but increases DMG dealt to enemies by ${fine(atTier(GALICTA.dmg, tier))} for ${GALICTA.lasts} sec instead. The DMG Boost effect can be stacked up to max ${GALICTA.most} times and is irremovable.`,
  'dark-lord-kasel': (tier) =>
    `Normal and Skill attacks reduce Heal Rate of the target by ${fine(atTier(AEA.heals, tier))} for ${AEA.lasts} sec and have a ${fine(AEA.chance)} chance of dealing additional P.DMG equal to ${fine(atTier(AEA.blow, tier) / 1000)} of ATK. The Heal Rate Reduction effect can be stacked up to max ${AEA.most} times.`,
  theo: (tier) =>
    `Normal and Skill attacks stack *Lightning* upon self. At ${LEGIOS.stacks} stacks, activates 'Lightning Bolt, Legios', increasing own ATK Spd by ${atTier(LEGIOS.speed, tier)}, Crit DMG by ${fine(atTier(LEGIOS.critDamage, tier))}, and DEF Penetration by ${atTier(LEGIOS.pen, tier)} for ${LEGIOS.lasts} sec. While 'Lightning Bolt, Legios' is activated, *Lightning* does not stack. This effect is irremovable.`,
  priscilla: (tier) =>
    `When attacking the enemy with [Vital Strike] or [Turbulent Dance], per every hit enemy, corresponding skill's cooldown is reduced by ${atTier(EXCILIUS.sooner, tier)} sec and ATK Spd is increased by ${EXCILIUS.speed} for ${EXCILIUS.lasts} sec. ATK Spd boost can be stacked up to ${EXCILIUS.most} times max.`,
  glenwys: (tier) =>
    `Whenever a Skill is cast, increases ATK of all allies by ${fine(atTier(MAXITHEA.atk, tier))} and Crit DMG by ${fine(atTier(MAXITHEA.critDamage, tier))}. This effect stacks up to ${MAXITHEA.most} times, and all effects are doubled at max stack. This effect cannot be dispelled.`,
  chase: (tier) =>
    `Increases own Crit DMG by ${fine(atTier(MONOLITH.critDamage, tier))}. Upon auto attack, deals P.DMG equal to ${fine(atTier(MONOLITH.flame, tier))} of ATK with *[Flame of Monolith]* and recovers HP equal to ${fine(MONOLITH.heal)} of DMG dealt. While in [Remove Limit] state, the effect of *[Flame of Monolith]* is doubled.`,
  aselica: (tier) =>
    `Attacking the enemy with ${IGNISIUS.every} normal attacks increases M.DMG the target takes by ${fine(atTier(IGNISIUS.takes, tier))} for ${IGNISIUS.lasts} sec, and inflicts Stun for ${IGNISIUS.stun} sec. The M.DMG Boost effect is irremovable.`,
  lakrak: (tier) =>
    `Increases the success rate of an *[Experiment]* by ${fine(atTier(MK1.success, tier))}, and every time Lakrak has a successful *[Experiment]*, increases ATK by ${fine(atTier(MK1.atk, tier))}, ATK Spd by ${atTier(MK1.speed, tier)}, and DMG to Non-Hero enemies by ${fine(atTier(MK1.boss, tier))}. This effect can be stacked up to max ${MK1.most} times and is irremovable.`,
  miruru: (tier) =>
    `Deals P.DMG equal to ${fine(atTier(LEVIATHAN.blow, tier))} of ATK to the enemies inflicted by the [Boooooom!] skill at a ${fine(LEVIATHAN.chance)} chance, and the target takes ${fine(atTier(LEVIATHAN.takes, tier))} more P.DMG for ${LEVIATHAN.lasts} sec.`,
  mirianne: (tier) =>
    `Increases ATK Spd by ${atTier(RIVENTINA.speed, tier)}, and attacks on *[Target Lock On]* enemies deal ${fine(atTier(RIVENTINA.blow, tier))} of ATK as extra M.DMG. Extra damage effect occurs once in ${RIVENTINA.every} sec.`,
  kara: (tier) => `Increases ATK by ${fine(SHATTERER.atk)} every sec. Can be stacked up to max ${atTier(SHATTERER.most, tier)} times.`,
  zafir: (tier) =>
    `Upon using a skill, gains a stack of *Will of Desert*. *Will of Desert* increases ATK and Crit DMG by ${fine(atTier(ZARIES.boost, tier))} for ${ZARIES.lasts} sec, and can be stacked up to max ${ZARIES.most} times. This effect cannot be dispelled.`,
  pansirone: (tier) =>
    `Each attack on an enemy inflicted with *[Eternal Blaze]* increases own ATK and DEF by ${fine(atTier(TERSIA.boost, tier))}, and DMG dealt from *[Eternal Blaze]* by ${fine(atTier(TERSIA.boost, tier))}. This effect can be stacked up to max ${TERSIA.most} times.`,
  isolet: (tier) =>
    `Increases P.DMG the enemy with the highest ATK takes by ${fine(atTier(TERRAVION.takes, tier))} for ${TERRAVION.lasts} sec and own DMG dealt to enemies by ${fine(atTier(TERRAVION.dmg, tier))} every ${TERRAVION.every} sec. The DMG Boost effect can be stacked up to max ${TERRAVION.most} times and is irremovable.`,
  lilia: (tier) =>
    `Mana is recovered by ${atTier(CIELAMAHA.mana, tier)} per each sec, and upon each ATK there is an ${fine(CIELAMAHA.chance)} chance of dealing ${fine(atTier(CIELAMAHA.blow, tier))} of ATK as P.DMG.`,
  lucias: (tier) =>
    `When the battle starts, reduces P.DMG all allies take by ${fine(atTier(BENEDICIA.taken, tier))}, increases their ATK Spd by ${atTier(BENEDICIA.speed, tier)}, and increases DMG dealt to Non-Hero enemies by ${fine(atTier(BENEDICIA.boss, tier))} for ${BENEDICIA.lasts} sec.`,
  rehartna: (tier) =>
    `Upon using Skills ${NEW_ROAD.skills} times, dispels negative effects from all allies and reduces All DMG they take by ${fine(atTier(NEW_ROAD.taken, tier))} for ${NEW_ROAD.lasts} sec.`,
  shea: (tier) =>
    `Increases CC Resist by ${atTier(SCHWANHEITE.resist, tier)}. Upon gaining a stack of *[Blissful Performance]*, reduces own Cooldown of all Skills by ${fine(atTier(SCHWANHEITE.sooner, tier))} and recovers own Mana by ${atTier(SCHWANHEITE.mana, tier)}.`,
  lavril: (tier) =>
    `Upon using a skill, gains [Void Soul] for ${atTier(NEMECIA.untouched, tier)} sec and dodges all attacks. This effect activates once every ${NEMECIA.every} sec. Increases Crit DMG of the ally under *[Soul Link]* by ${fine(atTier(NEMECIA.critDamage, tier))}.`,
  evan: (tier) =>
    `Whenever Evan uses a Skill, recovers own Mana by ${atTier(NAAV.mana, tier)}, reduces P.DMG all allies take by ${fine(atTier(NAAV.taken, tier))} for ${NAAV.lasts} sec, and increases P.DMG all enemies take by ${fine(atTier(NAAV.takes, tier))} for ${NAAV.lasts} sec.`,
  estelle: (tier) =>
    `Increases the duration of [Adventure Guide] by ${atTier(STOSMOS.longer, tier)} sec, and ATK of all allies by ${fine(atTier(STOSMOS.atk, tier))} while Estelle is in [Adventure Guide] state.`,
  jane: (tier) =>
    `Deals M.DMG equal to ${fine(atTier(EREKURA.blow, tier))} of ATK to nearby enemies and reduces their ATK by ${fine(atTier(EREKURA.weaker, tier))} every sec. Additionally, increases DMG dealt against Non-Hero enemies of the ally with the highest ATK excluding self by ${fine(atTier(EREKURA.boss, tier))}. The DMG Boost effect is irremovable. When the Passive Skill is activated, recovers ${fine(EREKURA.mana)} of Mana.`,
};
const NAMES: Readonly<Record<string, string>> = { klaus: EXIAN.name, kirze: ELICIPIRA.name, 'fallen-frey': ROSMERTA.name, gremory: PIGRITIA.name, annette: RASCAL.name, morrah: CARPRAIN.name, laias: ELTOIRRE.name, seria: ELSION.name, ezekiel: BARBATOS.name, lorraine: ROBURU.name, valance: CORBEAU.name, lucikiel: GIGANTE.name, selene: NOTOS.name, crow: AKISTRA.name, oddy: TEMPODIANA.name, phillop: ATEIN.name, naila: BARORO.name, yanne: SVELTA.name, neraxis: ACRAVITA.name, erze: PERION.name, loman: GAIAMENES.name, gau: NUMINU.name, tanya: CAETHASIS.name, 'rebel-klaus': GALICTA.name, 'dark-lord-kasel': AEA.name, theo: LEGIOS.name, priscilla: EXCILIUS.name, glenwys: MAXITHEA.name, chase: MONOLITH.name, aselica: IGNISIUS.name, lakrak: MK1.name, miruru: LEVIATHAN.name, mirianne: RIVENTINA.name, kara: SHATTERER.name, zafir: ZARIES.name, pansirone: TERSIA.name, isolet: TERRAVION.name, lilia: CIELAMAHA.name, lucias: BENEDICIA.name, rehartna: NEW_ROAD.name, shea: SCHWANHEITE.name, lavril: NEMECIA.name, evan: NAAV.name, estelle: STOSMOS.name, jane: EREKURA.name };
/** A hero's unique weapon's name (none: it has none here). */
export const uniqueName = (hero: string): string | undefined => NAMES[hero];
/** The heroes that have a unique weapon, by id. */
export const UNIQUE_HEROES: readonly string[] = Object.keys(ABOUT);

/** What a hero's unique weapon does at a tier (null: it has none). */
export const uniqueAbout = (hero: string, tier: number): string | null => ABOUT[hero]?.(tier) ?? null;

/** A hero's unique weapon as it fights: its tier (null: none, or not its own, or one this fight doesn't know). */
export function uniqueOf(hero: string, tier: number | null | undefined): number | null {
  if (typeof tier !== 'number' || !Number.isFinite(tier) || !ABOUT[hero]) return null;
  return Math.min(TIERS, Math.max(0, Math.floor(tier)));
}

/** A hero's unique weapon, as a square on its card. */
export const uniqueBuff = (hero: string, tier: number): Buff => ({ name: `${NAMES[hero] ?? 'Unique weapon'} (★${tier})`, about: uniqueAbout(hero, tier) ?? '', icon: '🗡️', art: { uw: hero } });

/** What Exian gives Klaus for a while, what Rosmerta gives Fallen Frey, what Rascal gives every ally while Annette is Overcharged, and what Eltoirre gives every ally while Laias is on the field. */
export const EXIAN_UP: Buff = { name: 'The Guardian, Exian', about: 'P.DEF and ATK higher (the ATK twice as much for the ally with the highest ATK).', icon: '🛡️', art: { uw: 'klaus' } };
export const ROSMERTA_UP: Buff = { name: 'Angel’s Despair, Rosmerta', about: 'Sees past more of the boss’s defense.', icon: '🖤', art: { uw: 'fallen-frey' } };
export const ROSMERTA_KASEL: Buff = { name: 'Angel’s Despair, Rosmerta (Dark Lord Kasel)', about: 'Attack speed higher, with Fallen Frey.', icon: '🖤', art: { uw: 'fallen-frey' } };
export const RASCAL_UP: Buff = { name: 'Crystallized Technomagic, Rascal', about: 'Deals more to the boss and takes less from it while Annette is [Overcharged].', icon: '🤖', art: { uw: 'annette' } };
export const ELTOIRRE_UP: Buff = { name: 'Flowing Circle, Eltoirre', about: 'Healing reaches it the more, and M.DEF higher by a share of Laias’s ATK, while Laias is on the field.', icon: '☥', art: { uw: 'laias' } };
export const ELSION_UP: Buff = { name: 'Executioner of Domains, Elsion', about: 'Healing reaches her the more.', icon: '⚔️', art: { uw: 'seria' } };
export const CORBEAU_UP: Buff = { name: 'Wonder of Magos Le’Flamme, Corbeau Rose', about: 'Gains by the TechnoMagic gear it wears while Valance is on the field.', icon: '🌹', art: { uw: 'valance' } };
export const GIGANTE_UP: Buff = { name: 'Incarnation of Doom', about: 'ATK and attack speed higher for each; at the most, his blows deal more through the boss’s defense.', icon: '👿', art: { uw: 'lucikiel' } };
export const NOTOS_UP: Buff = { name: 'Green Winds, Notos', about: 'Quicker, and her attack shoots an arrow more.', icon: '🍃', art: { uw: 'selene' } };
export const AKISTRA_UP: Buff = { name: 'Hellhound, Akistra', about: 'ATK and crit damage higher.', icon: '🐺', art: { uw: 'crow' } };
export const TEMPODIANA_UP: Buff = { name: 'Moonshade Countdown, Tempodiana', about: 'ATK higher.', icon: '🕰️', art: { uw: 'oddy' } };
export const ATEIN_UP: Buff = { name: 'Dragon’s Ruins, Atein', about: 'Defense higher while Phillop is hurt.', icon: '🐉', art: { uw: 'phillop' } };
export const DRAGON_RAGE: Buff = { name: 'Dragon Rage', about: 'ATK and defense higher for each.', icon: '🐉', art: { uw: 'phillop' } };
export const SVELTA_UP: Buff = { name: 'Dragonbane, Svelta', about: 'A critical blow deals more and gains her mana.', icon: '🐲', art: { uw: 'yanne' } };
export const ACRAVITA_UP: Buff = { name: 'Storm of Neraxis', about: 'Defense higher by a share of Neraxis’s, and ATK higher.', icon: '🌪️', art: { uw: 'neraxis' } };
export const PERION_UP: Buff = { name: 'Essence of Greed, Perion', about: 'ATK and attack speed higher for each.', icon: '🩸', art: { uw: 'erze' } };
export const GAIAMENES_UP: Buff = { name: 'Blessing of Orvelia', about: 'M.DEF higher.', icon: '🛡️', art: { uw: 'loman' } };
export const NUMINU_UP: Buff = { name: 'Holy Bird, Numinu', about: 'Max HP higher: he takes that much less.', icon: '🕊️', art: { uw: 'gau' } };
export const CAETHASIS_UP: Buff = { name: 'Demon of the Calm, Caethasis', about: 'Crit damage higher.', icon: '👁️', art: { uw: 'tanya' } };
export const BARORO_UP: Buff = { name: 'Cursed Claws, Baroro', about: 'DMG higher for each.', icon: '🐾', art: { uw: 'naila' } };
export const GALICTA_UP: Buff = { name: 'Adversary of the Goddess, Galicta', about: 'Penetration higher; each skill costs HP but stacks DMG higher.', icon: '⚔️', art: { uw: 'rebel-klaus' } };
export const AEA_UP: Buff = { name: 'Corrupted Holy Sword, Aea', about: 'Each blow leaves the boss healed less, and may deal a blow more.', icon: '🗡️', art: { uw: 'dark-lord-kasel' } };
export const LEGIOS_UP: Buff = { name: 'Lightning Bolt, Legios', about: 'Attack speed, crit DMG and penetration higher.', icon: '⚡', art: { uw: 'theo' } };
export const EXCILIUS_UP: Buff = { name: 'Tumultuous Dance, Excilius', about: 'Attack speed higher for each.', icon: '💃', art: { uw: 'priscilla' } };
export const MAXITHEA_UP: Buff = { name: 'The Counterattack, Maxithea', about: 'ATK and crit DMG higher for each.', icon: '🛡️', art: { uw: 'glenwys' } };
export const MONOLITH_UP: Buff = { name: 'Blood Lancer Monolith', about: 'Crit DMG higher; his attack a blow of flame more.', icon: '🔥', art: { uw: 'chase' } };
export const MK1_UP: Buff = { name: 'Lakrak MK-1', about: 'ATK, attack speed and DMG to Non-Hero enemies higher for each [Experiment] success.', icon: '💣', art: { uw: 'lakrak' } };
export const RIVENTINA_UP: Buff = { name: 'Endless Acceleration, Riventina', about: 'Quicker, and a blow more on an enemy under [Target Lock On].', icon: '🎯', art: { uw: 'mirianne' } };
export const SHATTERER_UP: Buff = { name: 'Heaven Shatterer', about: 'ATK higher for each.', icon: '⚙️', art: { uw: 'kara' } };
export const ZARIES_UP: Buff = { name: 'Will of Desert', about: 'ATK and crit DMG higher for each.', icon: '🏜️', art: { uw: 'zafir' } };
export const TERSIA_UP: Buff = { name: 'Roar of Raging Heat, Tersia', about: 'ATK, DEF and the blaze higher for each.', icon: '🔥', art: { uw: 'pansirone' } };
export const TERRAVION_UP: Buff = { name: 'Conqueror of Darkness, Del Terravion', about: 'DMG higher for each.', icon: '⚙️', art: { uw: 'isolet' } };
export const CIELAMAHA_UP: Buff = { name: 'Infinite Spring, Cielamaha', about: 'Mana every second, and now and then a blow more.', icon: '💧', art: { uw: 'lilia' } };
export const BENEDICIA_UP: Buff = { name: 'Blessing of Light, Benedicia', about: 'Takes less physical damage, quicker, and deals more to Non-Hero enemies.', icon: '✨', art: { uw: 'lucias' } };
export const NEW_ROAD_UP: Buff = { name: 'Anthem of a New Road, Matimaruma', about: 'Takes less.', icon: '🎵', art: { uw: 'rehartna' } };
export const SCHWANHEITE_UP: Buff = { name: 'Charming Melody, Schwanheite', about: 'CC resist higher.', icon: '🎶', art: { uw: 'shea' } };
export const NEMECIA_UP: Buff = { name: 'Void Soul, Dunn Nemecia', about: 'Untouched a moment as she uses a skill.', icon: '👻', art: { uw: 'lavril' } };
export const NAAV_UP: Buff = { name: 'Small Synthesized Darkness, Naav Gehen', about: 'Takes less physical damage.', icon: '🌑', art: { uw: 'evan' } };
export const STOSMOS_UP: Buff = { name: 'Chant of Tailwinds, Stosmos', about: 'ATK higher.', icon: '🍃', art: { uw: 'estelle' } };
export const EREKURA_UP: Buff = { name: 'Unchanging Mind, Erekura', about: 'Deals more to Non-Hero enemies.', icon: '⚰️', art: { uw: 'jane' } };

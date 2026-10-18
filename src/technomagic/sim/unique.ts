import { fine, pct, type Buff } from './shown';

/*
 * The heroes' unique weapons, as the fight has them: a hero wearing its own (the bot says how far it is
 * refined, R1 to R5, as the fight begins: its tier, 1 to 5) has its weapon's effect, on itself alone. ./fight.ts
 * applies them. Each is King's Raid's (kingsraid.shodyra.com, its 1★ to 5★; its 0★ is left out), but only for the
 * hero wielding it:
 *
 * - Klaus, The Guardian, Exian: every third skill he uses, his ATK and defense are higher for a while.
 *   (The game's raises every ally's, and the highest ATK's twice over.)
 * - Kirze, Judgment Edge, Elicipira: each of her blows (her attack's and her skills') may deal more, a share
 *   of her ATK, twice over against a boss. (The game's also widens Bloom, Crimson Flower!: there's only the boss.)
 * - Fallen Frey, Angel's Despair, Rosmerta: each skill she uses heals her, and she sees past more of the
 *   boss's defense for a while. (The game's heals the two allies with the highest ATK, and raises theirs.)
 * - Gremory, Gateway to Purgatory, Pigritia: she is quicker; each time she sleeps she is healed and her mana
 *   filled a share over 2 seconds, and her Mana Charge raises her ATK more. (Her part does it: ./heroes/gremory.ts.)
 * - Annette, Crystallized Technomagic, Rascal: every so often she gains a Charge (even while Overcharged) and a
 *   little mana; and while she is Overcharged every ally deals more and takes less, twice as much for the ally with
 *   the highest ATK. (Her part does it: ./heroes/annette.ts.)
 * - Laias, Flowing Circle, Eltoirre: healing reaches every ally the more, and every 5 seconds the ally with the
 *   lowest health is healed. (The game's also raises every ally's M.DEF by a share of her ATK. Her part does it:
 *   ./heroes/laias.ts.)
 * - Seria, Executioner of Domains, Elsion: a critical blow of her skills deals more, leaves the boss healed less for a
 *   while, and her healed more (up to 5 times over). (Her part does it: ./heroes/seria.ts.)
 * - Morrah, Flame of Victory, Carprain: now and then a blow of her attack leaves the boss hitting less hard and
 *   taking more magical damage for a while, twice as much more with her Flame stacked full on it. (Her part does it: ./heroes/morrah.ts.)
 * - Ezekiel, Jailer of Despair, Barbatos: his Fury lasts longer, and while it does his critical blows are harder and
 *   he stands being knocked down better. (His part does it: ./heroes/ezekiel.ts.)
 * - Lorraine, World Tree's Will, Roburu: every 7 seconds, with her Poison on the boss, a blow that leaves it taking more
 *   magical damage for a while. (The game's also lowers its M.DEF: left out. Her part does it: ./heroes/lorraine.ts.)
 * - Valance, Wonder of Magos Le'Flamme, Corbeau Rose: every ally gains by the TechnoMagic gear it wears, the same at
 *   every tier. (Her part does it: ./heroes/valance.ts.)
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
 * - Naila, Cursed Claws, Baroro: a critical blow of hers leaves the boss losing health for a while, and taking more
 *   physical damage meanwhile. (Her part does it: ./heroes/naila.ts.)
 * - Yanne, Dragonbane, Svelta: a critical blow of hers deals more and gains her mana, no sooner than a moment after the
 *   last; the same at every tier. (The game's more against a Dragon: nothing here, Galgoria is a chimera. Her part does
 *   it: ./heroes/yanne.ts.)
 * - Neraxis, Roaring Dragonmaw, Acravita: every so many blows of his attack a blow more that stuns the boss a moment,
 *   and the Storm of Neraxis for a while: every ally's defense higher by a share of his, and its ATK higher. (His part
 *   does it: ./heroes/neraxis.ts.)
 * - Erze, Essence of Greed, Perion: each blow of her skills a stack (up to so many, for a while), each her ATK and
 *   attack speed higher. (Her part does it: ./heroes/erze.ts.)
 * - Loman, Wave of Protection, Gaiamenes: every 3rd skill of his a blow that leaves the boss taking more physical
 *   damage, and his M.DEF higher for a while. (His part does it: ./heroes/loman.ts.)
 * - Gau, Holy Bird, Numinu: his max HP higher (here: taking that much less), and now and then a blow of his attack
 *   deals more and freezes the boss. (His part does it: ./heroes/gau.ts.)
 * - Tanya, Demon of the Calm, Caethasis: in Stealth from the start, and untouched for a moment; her crit damage higher
 *   while she is in Stealth. (Her part does it: ./heroes/tanya.ts.)
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
 * - Aselica, Solar Halo, Ignisius: every 5 blows of her attack, the boss takes more magical damage for a while and is
 *   stunned a moment.
 * - Lakrak, Lakrak MK-1: each part of his attack may gain him a stack of Gunpowder (up to 7), each his ATK, attack speed
 *   and DMG to Non-Hero enemies higher.
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
 *   (Each of these, the hero's part does it: ./heroes/<hero>.ts.)
 *
 * The game's shares of ATK are as they are for damage (this raid's blows are counted in thousandths of them: ./combat/),
 * and for a heal (a share of ATK: its hero's health and attack are the game's own, so it mends as much as there).
 */

/** Each weapon's numbers at its stars, 0★ to 5★ (the index is its stars: King's Raid's, kingsraid.shodyra.com's). */
export const EXIAN = { name: 'The Guardian, Exian', every: 3, lasts: 15, boost: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25] };
export const ELICIPIRA = { name: 'Judgment Edge, Elicipira', chance: 0.04, boss: 2, blow: [5000, 6000, 7200, 8600, 10000, 12500] };
export const ROSMERTA = { name: 'Angel’s Despair, Rosmerta', lasts: 7, heal: [1.667, 2, 2.4, 2.9, 3.5, 4.2], pen: [200, 240, 290, 350, 420, 500] };
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
export const RASCAL = { name: 'Crystallized Technomagic, Rascal', every: [1.5, 1.4, 1.3, 1.1, 0.9, 0.7], mana: 0.01, dmg: 0.02, taken: 0.02, top: 2 };
/** The chance a blow of her attack has, how long what it leaves on the boss lasts (seconds), and how much less hard it hits and more magical damage it takes (`full` times that more with her Flame stacked full on it). */
export const CARPRAIN = { name: 'Flame of Victory, Carprain', chance: 0.2, lasts: 10, weaker: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], full: 2 };
/** A critical skill blow's blow more (at ATK), what it takes off the boss's heals for `lasts` seconds, and what each of its stacks (up to `most`, for `healed` seconds) adds to hers. */
export const ELSION = { name: 'Executioner of Domains, Elsion', blow: [500, 600, 720, 860, 1030, 1250], unhealed: [0.24, 0.29, 0.35, 0.42, 0.5, 0.6], lasts: 5, heals: [0.04, 0.05, 0.06, 0.07, 0.09, 0.1], most: 5, healed: 20 };
/** How much more healing reaches every ally, how often (seconds) the ally with the lowest health is healed, and by how much (a share of her ATK). */
export const ELTOIRRE = { name: 'Flowing Circle, Eltoirre', heals: [0.08, 0.1, 0.12, 0.14, 0.17, 0.2], every: 5, mend: [1, 1.2, 1.4, 1.7, 2.1, 2.5] };
/** How many seconds longer his Fury lasts, and what it adds to his crit damage (a share more) and CC resist (points) while it does. */
export const BARBATOS = { name: 'Jailer of Despair, Barbatos', longer: [2, 3, 4, 5, 6, 7], critDamage: [0.8, 0.9, 1, 1.1, 1.2, 1.3], resist: [200, 240, 290, 350, 420, 500] };
/** How often (seconds) it strikes a poisoned boss, how hard (at ATK), and how much more magical damage the boss takes after, for `lasts` seconds. */
export const ROBURU = { name: 'World Tree’s Will, Roburu', every: 7, blow: [1000, 1200, 1400, 1700, 2100, 2500], takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 };

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
/** What a critical blow leaves eating at the boss over `lasts` seconds (all of it, at ATK), and how much more physical damage it takes meanwhile. */
export const BARORO = { name: 'Cursed Claws, Baroro', lasts: 10, blow: [1500, 1800, 2160, 2580, 3100, 5000], takes: [0.2, 0.24, 0.28, 0.34, 0.41, 0.5] };

/** What a critical blow of hers deals more (at ATK) and the mana it gains her, no sooner than `every` seconds after the last (the same at every tier). */
export const SVELTA = { name: 'Dragonbane, Svelta', blow: 500, mana: 150, every: 0.5 };
/** How many blows of his attack bring it on; its blow (at ATK) and stun; and the Storm of Neraxis for `lasts` seconds: every ally's defense higher by a share of his, and its ATK (a share). */
export const ACRAVITA = { name: 'Roaring Dragonmaw, Acravita', blows: [20, 19, 18, 17, 16, 15], blow: 1000, stun: 0.5, lasts: 10, defense: [0.04, 0.048, 0.057, 0.069, 0.083, 0.1], atk: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25] };
/** What each stack adds to her ATK (a share) and attack speed (points), for `lasts` seconds, up to `most`. */
export const PERION = { name: 'Essence of Greed, Perion', atk: 0.005, speed: 5, lasts: 30, most: [80, 90, 110, 130, 160, 200] };
/** Every `skills` skills of his: a blow (at ATK), the boss taking more physical damage for `lasts` seconds, and his M.DEF higher (a share) for `guards`. */
export const GAIAMENES = { name: 'Wave of Protection, Gaiamenes', skills: 3, blow: [2000, 2400, 2900, 3500, 4200, 5000], weakness: [0.25, 0.3, 0.36, 0.43, 0.51, 0.6], lasts: 20, defense: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], guards: 10 };
/** His max HP higher (a share: here, taking that much less); and how likely a blow of his attack is to deal more (at ATK) and freeze the boss for `freeze` seconds. */
export const NUMINU = { name: 'Holy Bird, Numinu', hp: [0.12, 0.14, 0.17, 0.21, 0.25, 0.3], chance: 0.15, blow: [2000, 2400, 2900, 3500, 4200, 5000], freeze: 2 };
/** In Stealth for `lasts` seconds from the start, untouched for the first so many; and her crit damage higher (a share) while she is in Stealth. */
export const CAETHASIS = { name: 'Demon of the Calm, Caethasis', lasts: 10, untouched: [2, 2.4, 2.9, 3.5, 4.2, 5], critDamage: [0.3, 0.36, 0.43, 0.52, 0.62, 0.75] };
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
/** Aselica's: every how many blows; the boss's more magical damage taken, for how long; its stun. */
export const IGNISIUS = { name: 'Solar Halo, Ignisius', every: 5, takes: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], lasts: 10, stun: 0.5 };
/** Lakrak's: its chance, up to how many; each one's ATK, attack speed and more to Non-Hero enemies. */
export const MK1 = { name: 'Lakrak MK-1', chance: 0.25, most: 7, atk: [0.03, 0.036, 0.043, 0.051, 0.062, 0.075], speed: [30, 36, 43, 51, 62, 75], boss: [0.03, 0.036, 0.043, 0.051, 0.062, 0.075] };
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
export const SCHWANHEITE = { name: 'Charming Melody, Schwanheite', resist: [300, 360, 430, 520, 630, 700], sooner: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], mana: [400, 480, 580, 700, 840, 1000] };
/** Lavril's: how long untouched, no more often than; her linked ally's crit DMG. */
export const NEMECIA = { name: 'Void Soul, Dunn Nemecia', untouched: [1, 1.2, 1.4, 1.7, 2.1, 2.5], every: 10, critDamage: [0.3, 0.36, 0.42, 0.51, 0.63, 0.75] };
/** Evan's: mana; every ally's physical damage less and the boss's more, for how long. */
export const NAAV = { name: 'Small Synthesized Darkness, Naav Gehen', mana: [400, 480, 580, 700, 840, 1000], taken: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 5 };
/** Estelle's: [Adventure Guide]'s more seconds; every ally's ATK meanwhile. */
export const STOSMOS = { name: 'Chant of Tailwinds, Stosmos', longer: [1, 2, 3, 4, 5, 6], atk: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25] };

/** What every ally gains by the TechnoMagic gear it wears (the same at every tier): 1 piece, more ATK; 2, more defense; 3, more max HP (here: taking that much less); 4, more DMG. */
export const CORBEAU = { name: 'Wonder of Magos Le’Flamme, Corbeau Rose', atk: 0.06, defense: 0.06, hp: 0.06, dmg: 0.04 };

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

/** What each hero's weapon does at a tier, as its card and the heroes page say it. */
const ABOUT: Readonly<Record<string, (tier: number) => string>> = {
  klaus: (tier) => `Every ${EXIAN.every}rd skill he uses, his ATK and defense are ${pct(atTier(EXIAN.boost, tier))} higher for ${EXIAN.lasts} seconds.`,
  kirze: (tier) => `Each of her blows has a ${pct(ELICIPIRA.chance)} chance to deal ${pct(atTier(ELICIPIRA.blow, tier) / 1000)} of her ATK more, doubled against the boss.`,
  'fallen-frey': (tier) => `Each skill she uses heals her by ${pct(atTier(ROSMERTA.heal, tier))} of her ATK, and gives her +${atTier(ROSMERTA.pen, tier)} penetration for ${ROSMERTA.lasts} seconds.`,
  gremory: (tier) =>
    `+${atTier(PIGRITIA.speed, tier)} attack speed. Each time she sleeps she is healed by ${pct(atTier(PIGRITIA.heal, tier))} of her max HP and recovers ${pct(atTier(PIGRITIA.mana, tier))} of her mana over ${PIGRITIA.over} seconds, and each Mana Charge gives her ${fine(atTier(PIGRITIA.charge, tier))} more ATK.`,
  annette: (tier) =>
    `Every ${atTier(RASCAL.every, tier)} seconds she gains a Charge (even while Overcharged) and ${pct(RASCAL.mana)} of her mana. While she is Overcharged, every ally deals ${pct(RASCAL.dmg)} more and takes ${pct(RASCAL.taken)} less (${pct(RASCAL.dmg * RASCAL.top)} for the ally with the highest ATK).`,
  morrah: (tier) =>
    `Each blow of her attack has a ${pct(CARPRAIN.chance)} chance to leave the boss hitting ${pct(atTier(CARPRAIN.weaker, tier))} less hard and taking ${pct(atTier(CARPRAIN.weaker, tier))} more magical damage for ${CARPRAIN.lasts} seconds (${pct(atTier(CARPRAIN.weaker, tier) * CARPRAIN.full)} more with 100 Flame on it).`,
  laias: (tier) =>
    `Healing reaches every ally ${pct(atTier(ELTOIRRE.heals, tier))} more, and every ${ELTOIRRE.every} seconds she heals the ally with the lowest HP by ${pct(atTier(ELTOIRRE.mend, tier))} of her ATK.`,
  seria: (tier) =>
    `Each critical blow of her skills deals ${pct(atTier(ELSION.blow, tier) / 1000)} of her ATK more, leaves the boss healed ${pct(atTier(ELSION.unhealed, tier))} less for ${ELSION.lasts} seconds, and heals her ${pct(atTier(ELSION.heals, tier))} more for ${ELSION.healed} seconds (up to ${ELSION.most} times).`,
  ezekiel: (tier) =>
    `His Fury lasts ${atTier(BARBATOS.longer, tier)} seconds longer, and while it does his crit damage is ${pct(atTier(BARBATOS.critDamage, tier))} higher and his CC resist +${atTier(BARBATOS.resist, tier)}.`,
  lorraine: (tier) =>
    `Every ${ROBURU.every} seconds, with her Poison on the boss, deals ${pct(atTier(ROBURU.blow, tier) / 1000)} of her ATK to it, and it takes ${pct(atTier(ROBURU.takes, tier))} more magical damage for ${ROBURU.lasts} seconds.`,
  valance: () =>
    `Every ally gains by the TechnoMagic gear it wears: with 1 piece, +${pct(CORBEAU.atk)} ATK; 2, +${pct(CORBEAU.defense)} defense; 3, +${pct(CORBEAU.hp)} max HP (it takes that much less); 4, +${pct(CORBEAU.dmg)} DMG.`,
  lucikiel: (tier) =>
    `Every ${GIGANTE.blows} of his blows gain him a stack of [Incarnation of Doom] (up to ${GIGANTE.most}), each +${fine(atTier(GIGANTE.atk, tier))} ATK and +${atTier(GIGANTE.speed, tier)} attack speed. At ${GIGANTE.most}, each of his blows deals ${pct(atTier(GIGANTE.blow, tier) / 1000)} of his ATK more, through the boss’s defense.`,
  selene: (tier) =>
    `Each critical blow of hers gives her +${atTier(NOTOS.speed, tier)} attack speed for ${NOTOS.lasts} seconds, and meanwhile her attack shoots an arrow more, dealing ${pct(atTier(NOTOS.arrow, tier) / 1000)} of her ATK.`,
  crow: (tier) =>
    `His attack shoots a bullet more, dealing ${pct(atTier(AKISTRA.bullet, tier) / 1000)} of his ATK. A skill of his raises his ATK and crit damage by ${pct(atTier(AKISTRA.boost, tier))} for ${AKISTRA.lasts} seconds, once every ${AKISTRA.every} seconds.`,
  oddy: (tier) =>
    `Her [Time Distortion] takes ${atTier(TEMPODIANA.cooldown, tier)} seconds more off every ally’s cooldowns, and raises their ATK by ${pct(atTier(TEMPODIANA.atk, tier))} for ${TEMPODIANA.lasts} seconds.`,
  phillop: (tier) =>
    `Hurt by the boss, every other ally’s defense is ${pct(atTier(ATEIN.defense, tier))} higher for ${ATEIN.guards} seconds, and he gains a stack of [Dragon Rage] for ${ATEIN.lasts} seconds (up to ${ATEIN.most}), each +${fine(atTier(ATEIN.rage, tier))} ATK and defense.`,
  naila: (tier) =>
    `Each critical blow of hers leaves the boss losing ${pct(atTier(BARORO.blow, tier) / 1000)} of her ATK over ${BARORO.lasts} seconds, and taking ${pct(atTier(BARORO.takes, tier))} more physical damage meanwhile.`,
  yanne: () => `Each critical blow of hers deals ${pct(SVELTA.blow / 1000)} of her ATK more and gains her ${SVELTA.mana} mana, no sooner than ${SVELTA.every} seconds after the last.`,
  neraxis: (tier) =>
    `Every ${atTier(ACRAVITA.blows, tier)} blows of his attack, deals ${pct(ACRAVITA.blow / 1000)} of his ATK to the boss and stuns it for ${ACRAVITA.stun} seconds, and becomes the [Storm of Neraxis] for ${ACRAVITA.lasts} seconds: every ally gains ${fine(atTier(ACRAVITA.defense, tier))} of his P.DEF and M.DEF, and +${pct(atTier(ACRAVITA.atk, tier))} ATK.`,
  erze: (tier) =>
    `Each blow of her skills gives her a stack for ${PERION.lasts} seconds (up to ${atTier(PERION.most, tier)}), each +${fine(PERION.atk)} ATK and +${PERION.speed} attack speed. They can’t be dispelled.`,
  loman: (tier) =>
    `Every ${GAIAMENES.skills} skills he uses, deals ${pct(atTier(GAIAMENES.blow, tier) / 1000)} of his ATK to the boss, which takes ${pct(atTier(GAIAMENES.weakness, tier))} more physical damage for ${GAIAMENES.lasts} seconds; and his M.DEF is ${pct(atTier(GAIAMENES.defense, tier))} higher for ${GAIAMENES.guards} seconds.`,
  gau: (tier) =>
    `His max HP is ${pct(atTier(NUMINU.hp, tier))} higher (he takes that much less). Each blow of his attack has a ${pct(NUMINU.chance)} chance to deal ${pct(atTier(NUMINU.blow, tier) / 1000)} of his ATK more and freeze the boss for ${NUMINU.freeze} seconds.`,
  tanya: (tier) =>
    `In [Stealth] for ${CAETHASIS.lasts} seconds as the fight begins, and the boss can’t touch her for the first ${atTier(CAETHASIS.untouched, tier)}. While she is in [Stealth], her crit damage is ${pct(atTier(CAETHASIS.critDamage, tier))} higher.`,
  'rebel-klaus': (tier) =>
    `+${atTier(GALICTA.pen, tier)} penetration. Each skill he uses costs him ${pct(GALICTA.hp)} of his current HP, but gives him a stack for ${GALICTA.lasts} seconds (up to ${GALICTA.most}), each +${fine(atTier(GALICTA.dmg, tier))} DMG. They can’t be dispelled.`,
  theo: (tier) =>
    `Each of his blows stacks Lightning on him; at ${LEGIOS.stacks}, for ${LEGIOS.lasts} seconds his attack speed is +${atTier(LEGIOS.speed, tier)}, his crit DMG +${pct(atTier(LEGIOS.critDamage, tier))} and his penetration +${atTier(LEGIOS.pen, tier)}, stacking none meanwhile. It can’t be dispelled.`,
  priscilla: (tier) =>
    `Each blow of Vital Strike and Turbulent Dance takes ${atTier(EXCILIUS.sooner, tier)} seconds off that skill's cooldown, and gives her +${EXCILIUS.speed} attack speed for ${EXCILIUS.lasts} seconds (up to ${EXCILIUS.most} times).`,
  glenwys: (tier) =>
    `Each skill she uses raises every ally's ATK by ${fine(atTier(MAXITHEA.atk, tier))} and crit DMG by ${fine(atTier(MAXITHEA.critDamage, tier))} (up to ${MAXITHEA.most} times; at ${MAXITHEA.most}, twice that). It can’t be dispelled.`,
  chase: (tier) =>
    `His crit DMG is ${pct(atTier(MONOLITH.critDamage, tier))} higher. Each part of his attack deals ${pct(atTier(MONOLITH.flame, tier))} of his ATK more with [Flame of Monolith], and heals him ${pct(MONOLITH.heal)} of it; under [Remove Limit], twice.`,
  aselica: (tier) =>
    `Every ${IGNISIUS.every} blows of her attack, the boss takes ${pct(atTier(IGNISIUS.takes, tier))} more magical damage for ${IGNISIUS.lasts} seconds and is stunned for ${IGNISIUS.stun}. It can’t be dispelled.`,
  lakrak: (tier) =>
    `Each part of his attack has a ${pct(MK1.chance)} chance to gain him a stack of Gunpowder (up to ${MK1.most}), each +${fine(atTier(MK1.atk, tier))} ATK, +${atTier(MK1.speed, tier)} attack speed and ${fine(atTier(MK1.boss, tier))} more to Non-Hero enemies. They can’t be removed.`,
  miruru: (tier) =>
    `Each shell of Boooooom! has a ${pct(LEVIATHAN.chance)} chance to deal ${pct(atTier(LEVIATHAN.blow, tier))} of her ATK more, and leave the boss taking ${pct(atTier(LEVIATHAN.takes, tier))} more physical damage for ${LEVIATHAN.lasts} seconds.`,
  mirianne: (tier) =>
    `+${atTier(RIVENTINA.speed, tier)} attack speed. Her blows on an enemy under [Target Lock On] deal ${pct(atTier(RIVENTINA.blow, tier))} of her ATK more, once every ${RIVENTINA.every} seconds.`,
  kara: (tier) => `Her ATK is ${pct(SHATTERER.atk)} higher every second, up to ${atTier(SHATTERER.most, tier)} times.`,
  zafir: (tier) =>
    `Each skill he uses gains him a stack of [Will of Desert] for ${ZARIES.lasts} seconds (up to ${ZARIES.most}), each +${fine(atTier(ZARIES.boost, tier))} ATK and crit DMG. It can’t be dispelled.`,
  pansirone: (tier) =>
    `Each of her blows on an enemy in [Eternal Blaze] raises her ATK and DEF, and the blaze's damage, by ${fine(atTier(TERSIA.boost, tier))} (up to ${TERSIA.most} times).`,
  isolet: (tier) =>
    `Every ${TERRAVION.every} seconds, the boss takes ${pct(atTier(TERRAVION.takes, tier))} more physical damage for ${TERRAVION.lasts} seconds, and her DMG is ${fine(atTier(TERRAVION.dmg, tier))} higher (up to ${TERRAVION.most} times). It can’t be removed.`,
  lilia: (tier) =>
    `+${atTier(CIELAMAHA.mana, tier)} mana every second; each part of her attack has a ${pct(CIELAMAHA.chance)} chance to deal ${pct(atTier(CIELAMAHA.blow, tier))} of her ATK more.`,
  lucias: (tier) =>
    `For the first ${BENEDICIA.lasts} seconds of the fight, every ally takes ${pct(atTier(BENEDICIA.taken, tier))} less physical damage, has +${atTier(BENEDICIA.speed, tier)} attack speed and deals ${pct(atTier(BENEDICIA.boss, tier))} more to Non-Hero enemies.`,
  rehartna: (tier) =>
    `Every ${NEW_ROAD.skills} skills she uses, what the boss has left on every ally is cleared, and they take ${pct(atTier(NEW_ROAD.taken, tier))} less for ${NEW_ROAD.lasts} seconds.`,
  shea: (tier) =>
    `+${atTier(SCHWANHEITE.resist, tier)} CC resist. Each stack of [Blissful Performance] takes ${pct(atTier(SCHWANHEITE.sooner, tier))} off her cooldowns and gains her ${atTier(SCHWANHEITE.mana, tier)} mana.`,
  lavril: (tier) =>
    `Each skill she uses, the boss's blows don't touch her for ${atTier(NEMECIA.untouched, tier)} seconds (once every ${NEMECIA.every} seconds at most). Her [Soul Link]'s ally has ${pct(atTier(NEMECIA.critDamage, tier))} more crit DMG.`,
  evan: (tier) =>
    `Each skill he uses gains him ${atTier(NAAV.mana, tier)} mana, and for ${NAAV.lasts} seconds every ally takes ${pct(atTier(NAAV.taken, tier))} less physical damage and the boss ${pct(atTier(NAAV.takes, tier))} more.`,
  estelle: (tier) => `[Adventure Guide] lasts ${atTier(STOSMOS.longer, tier)} seconds longer, and meanwhile every ally's ATK is ${pct(atTier(STOSMOS.atk, tier))} higher.`,
  'dark-lord-kasel': (tier) =>
    `Each of his blows leaves the boss healed ${fine(atTier(AEA.heals, tier))} less for ${AEA.lasts} seconds (up to ${AEA.most} times over), and has a ${pct(AEA.chance)} chance to deal ${pct(atTier(AEA.blow, tier) / 1000)} of his ATK more.`,
};
const NAMES: Readonly<Record<string, string>> = { klaus: EXIAN.name, kirze: ELICIPIRA.name, 'fallen-frey': ROSMERTA.name, gremory: PIGRITIA.name, annette: RASCAL.name, morrah: CARPRAIN.name, laias: ELTOIRRE.name, seria: ELSION.name, ezekiel: BARBATOS.name, lorraine: ROBURU.name, valance: CORBEAU.name, lucikiel: GIGANTE.name, selene: NOTOS.name, crow: AKISTRA.name, oddy: TEMPODIANA.name, phillop: ATEIN.name, naila: BARORO.name, yanne: SVELTA.name, neraxis: ACRAVITA.name, erze: PERION.name, loman: GAIAMENES.name, gau: NUMINU.name, tanya: CAETHASIS.name, 'rebel-klaus': GALICTA.name, 'dark-lord-kasel': AEA.name, theo: LEGIOS.name, priscilla: EXCILIUS.name, glenwys: MAXITHEA.name, chase: MONOLITH.name, aselica: IGNISIUS.name, lakrak: MK1.name, miruru: LEVIATHAN.name, mirianne: RIVENTINA.name, kara: SHATTERER.name, zafir: ZARIES.name, pansirone: TERSIA.name, isolet: TERRAVION.name, lilia: CIELAMAHA.name, lucias: BENEDICIA.name, rehartna: NEW_ROAD.name, shea: SCHWANHEITE.name, lavril: NEMECIA.name, evan: NAAV.name, estelle: STOSMOS.name };
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
export const EXIAN_UP: Buff = { name: 'The Guardian, Exian', about: 'ATK and defense higher.', icon: '🛡️', art: { uw: 'klaus' } };
export const ROSMERTA_UP: Buff = { name: 'Angel’s Despair, Rosmerta', about: 'Sees past more of the boss’s defense.', icon: '🖤', art: { uw: 'fallen-frey' } };
export const RASCAL_UP: Buff = { name: 'Crystallized Technomagic, Rascal', about: 'Deals more to the boss and takes less from it while Annette is [Overcharged].', icon: '🤖', art: { uw: 'annette' } };
export const ELTOIRRE_UP: Buff = { name: 'Flowing Circle, Eltoirre', about: 'Healing reaches it the more while Laias is on the field.', icon: '☥', art: { uw: 'laias' } };
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
export const CAETHASIS_UP: Buff = { name: 'Demon of the Calm, Caethasis', about: 'Crit damage higher while in Stealth.', icon: '👁️', art: { uw: 'tanya' } };
export const GALICTA_UP: Buff = { name: 'Adversary of the Goddess, Galicta', about: 'Penetration higher; each skill costs HP but stacks DMG higher.', icon: '⚔️', art: { uw: 'rebel-klaus' } };
export const AEA_UP: Buff = { name: 'Corrupted Holy Sword, Aea', about: 'Each blow leaves the boss healed less, and may deal a blow more.', icon: '🗡️', art: { uw: 'dark-lord-kasel' } };
export const LEGIOS_UP: Buff = { name: 'Lightning Bolt, Legios', about: 'Attack speed, crit DMG and penetration higher.', icon: '⚡', art: { uw: 'theo' } };
export const EXCILIUS_UP: Buff = { name: 'Tumultuous Dance, Excilius', about: 'Attack speed higher for each.', icon: '💃', art: { uw: 'priscilla' } };
export const MAXITHEA_UP: Buff = { name: 'The Counterattack, Maxithea', about: 'ATK and crit DMG higher for each.', icon: '🛡️', art: { uw: 'glenwys' } };
export const MONOLITH_UP: Buff = { name: 'Blood Lancer Monolith', about: 'Crit DMG higher; his attack a blow of flame more.', icon: '🔥', art: { uw: 'chase' } };
export const MK1_UP: Buff = { name: 'Gunpowder', about: 'ATK, attack speed and DMG to Non-Hero enemies higher for each.', icon: '💣', art: { uw: 'lakrak' } };
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

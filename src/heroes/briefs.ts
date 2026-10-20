/*
 * Each hero's skills in a line each (its three, then its passive), for where King's Raid's whole words would be too much
 * (the shop's buy box). Written from those words (the raid's: ../technomagic/sim/heroes/), without their numbers, so a
 * change to a number leaves them true. A hero with none here, or a skill past them, has its words' first sentence (brief).
 */
export const SKILL_BRIEFS: Readonly<Record<string, readonly string[]>> = {
  kirze: ['Spins through nearby enemies, then knocks those in front down.', 'A blast that stuns every enemy; allies attack faster.', 'A crystal explosion that curses enemies, bursting again later.', 'More ATK and crit; allies’ CC lasts longer on bosses.'],
  klaus: ['Leaps in and stuns enemies in range.', 'A shield bash that lowers enemies’ DEF and attack speed.', 'Raises all allies’ P.DEF and cuts the P.DMG they take.', 'Blocking hits back and weakens; guards allies when they’re hurt.'],
  'fallen-frey': ['Heals the weakest allies, then blasts the enemies there.', 'Shields the 4 weakest allies, making them CC-immune.', '20 hits of light that make enemies take more damage.', 'Takes more damage, but fills her mana fast for Darkened Power.'],
  gremory: ['Pochi bites 5 times, lowering ATK; extra damage to bosses.', 'Puchi strikes the farthest enemy and stuns it.', 'Pippi wraps an area, making enemies take more M.DMG.', 'Once all her skills are sealed: naps to unseal them, stronger each time.'],
  annette: ['A ray that lowers ATK and raises the M.DMG taken.', 'Cleanses and heals all allies; Overcharged, boosts their crit too.', 'An exploding orb; Overcharged, it stuns and weakens.', 'Builds Charge into Overcharge: more ATK, faster cooldowns.'],
  morrah: ['A fiery slam that knocks down and stacks Flame.', 'Raises allies’ M.DEF and block; burns nearby enemies.', 'A lava eruption that knocks down; Flame makes it hit harder.', 'Blocking sets nearby enemies aflame.'],
  laias: ['Heals all allies and raises their Heal Rate.', 'Shields the weakest ally, making them CC-immune.', 'A water burst that knocks down, heals allies and gives them mana.', 'Allies resist magic better; her skills cut the M.DMG they take.'],
  seria: ['Two sword slashes at the enemies in front.', 'Charges in, slowing enemies, then strikes them twice.', 'A wide moonlit slash; when the moon is ripe, it stops their healing.', 'High ATK; crit skill hits stack crit damage.'],
  ezekiel: ['Swipes nearby enemies and knocks them down.', 'Dashes at the strongest enemy and slows it.', 'A charged blow that stuns, ignoring damage reduction.', 'Every 3rd skill resets his cooldowns and sends him into Fury.'],
  lorraine: ['Three thorn strikes that poison.', 'Vines that poison and shackle enemies in a line.', 'Knocks down; poisoned enemies take more damage.', 'Normal attacks may poison random enemies.'],
  valance: ['A hologram on the top attacker: buffs, heals, CC immunity.', 'A force field: allies get DEF, healing, mana and CC immunity.', 'A laser barrage that stuns and makes enemies take more damage.', 'Boosts allies’ ATK and their damage to bosses.'],
  lucikiel: ['Three dark blows that leave a damaging shadow.', 'Two waves: a stun, then a pull.', 'Nine hits that pull enemies in and knock them down.', 'Takes less damage; shields himself after each skill.'],
  selene: ['Rains 12 arrows on random enemies.', 'Sends five arrows at the enemy.', 'A piercing arrow scaled by the target’s HP; extra to bosses.', 'Attacks stack ATK, crit chance and crit damage.'],
  crow: ['15 shots that leave Fang Marks.', 'A barrage, then a frost bullet that freezes.', 'A focused laser that spends Fang Marks for extra damage.', 'Big ATK and crit damage; attacks leave Fang Marks.'],
  oddy: ['Petrifies enemies in a line.', 'Six hits; may reset for a free recast.', 'Hits every enemy; halves allies’ cooldowns and speeds them up.', 'After a skill, his next attacks hit harder and may petrify.'],
  phillop: ['Knocks the enemy down.', 'A headbutt that knocks back and slows.', 'Raises his DEF, heals, and becomes CC-immune.', 'Attacks shred enemies’ P.DEF and dodge.'],
  naila: ['Two dashes that knock down; extra to non-heroes.', 'Allies dodge more and gain ATK.', 'A dive bomb; knocked-down enemies take more.', 'Attacks may knock down and expose to P.DMG.'],
  yanne: ['A focused shot in a line; stuns dragons.', 'Hits the target and those around it; extra to dragons.', 'Cleanses herself; big ATK and attacks that pierce a line.', 'More ATK and HP; much more damage to dragons.'],
  neraxis: ['Pulls enemies in, then stuns and slows them.', 'Raises allies’ ATK and DEF, lowers enemies’ ATK.', 'Six stunning hits in a large area.', 'Dragon hide: more DEF, less damage taken.'],
  erze: ['Hits every enemy and drains HP; stacks for extra hits.', 'Cleanses and turns invulnerable, then bursts marked enemies.', 'Ten seconds of damage to every enemy.', 'Kills raise her ATK and HP; survives a fatal blow.'],
  loman: ['Knocks down and exposes to P.DMG; blocks all damage meanwhile.', 'Cleanses and shields all allies, cutting the damage they take.', 'Three stunning strikes that mark enemies for his allies.', 'Builds Endurance into a blast that ignores DEF.'],
  gau: ['A smash that knocks down and slows.', 'Raises allies’ ATK and cleanses them.', 'A whirling attack that freezes; CC-immune meanwhile.', 'Attacks stack ATK and damage to non-heroes.'],
  tanya: ['Strikes the enemy with the least P.DEF, exposing it; Stealth.', 'A bleeding tornado; from Stealth, cuts their healing.', 'Six hits on random enemies; from Stealth, strips their buffs.', 'Crit skill hits strike again and silence.'],
  'rebel-klaus': ['A stunning strike; extra damage to bosses.', 'Hits nearby enemies, then gains attack speed and CC resistance.', 'Six hits, then a knockdown blast.', 'More crit; attacks curse every enemy and can ignore DEF.'],
  'dark-lord-kasel': ['Two slashes in a line that stop mana; more as the Dark Lord.', 'Knocks enemies away; as the Dark Lord, pulls the farthest in.', 'Becomes the Dark Lord: stronger skills and CC immunity.', 'No mana: his attacks build Dark Energy for his skills.'],
  theo: ['16 hits that stack crit damage and may stun.', 'A lightning spear: the enemy takes more M.DMG, Theo gains ATK.', 'A spear slam: five hits that stun.', 'Attacks may strike with lightning and stun.'],
  priscilla: ['A strike that always crits and stuns.', 'Cleanses and boosts herself and the top 3 attackers’ ATK.', 'Pulls enemies in; under Assault, exposes them to P.DMG.', 'More ATK, DEF penetration and crit damage.'],
  glenwys: ['Seven hits that stack P.DMG taken.', 'Ten stunning hits around her.', 'Knocks down, cleanses allies and raises their ATK and DEF.', 'Raises every ally’s ATK; less damage taken early on.'],
  chase: ['Blocks buffs, knocks back, then stuns those nearby.', 'Trades HP for crit damage, attack speed and CC immunity.', 'Charges in and stuns, healing himself.', 'Stronger the lower his HP; comes back once.'],
  aselica: ['A stunning strike, then faster attacks.', 'Buffs the top attacker: ATK and faster cooldowns.', 'Channels heals and DEF for allies, then knocks enemies down.', 'Attacks curse enemies; her skills protect and heal allies.'],
  lakrak: ['A shot in a line that stuns; extra to non-heroes.', 'A smoke bomb: blinds and exposes to P.DMG.', 'A sticky bomb that bursts after a moment.', 'Attacks may fire shells; skills may come out enhanced.'],
  miruru: ['Blasts every enemy back; counts as a normal attack.', 'Three knockdowns that stack P.DMG taken.', 'A pirate volley that slows; extra to non-heroes.', 'Every attack fires an extra shell and stacks ATK.'],
  mirianne: ['Three hits on the enemy with the least M.DEF, locking on.', 'Stuns, then shields herself and the top damage dealer.', 'Strikes the enemy lowest on HP; extra to non-heroes.', 'More ATK while a target is locked on.'],
  kara: ['A laser barrage that blows enemies away.', 'Cannon fire that stuns.', 'Switches between Anti-personnel and Siege modes.', 'Siege mode: more damage to bosses and CC immunity.'],
  zafir: ['A wide strike that shortens its cooldown for each hit.', 'Shields the 2 weakest allies; a sandstorm follows.', 'Summons Sand Hell: damage, P.DEF down, and a pull.', 'Attacks may hit every enemy and mark them.'],
  pansirone: ['Sets enemies ablaze, burning them and cutting their healing.', '13 hits; raises her ATK and DEF penetration.', 'Ten hits that grow stronger on the same target.', 'More ATK and damage to non-heroes; rekindles the blaze.'],
  isolet: ['Flame that Ignites and cuts healing.', 'Five freezing hits; Ignited enemies explode.', '20 hits that lower ATK; on Ignited enemies, a Blazing Storm.', 'Fixed attack speed; skills give mana back and big crit damage.'],
  lilia: ['A water tempest that keeps hitting.', 'Faster mana, and more ATK and DEF.', 'Water drops that stun, spending mana as they fly.', 'More ATK and crit, growing with her mana recovery.'],
  lucias: ['Heals the 4 weakest allies and cuts the P.DMG they take.', 'A zone that buffs, cleanses and heals allies and stuns enemies.', 'Allies gain dodge and ATK; their attacks hit harder.', 'Spends HP on her heals to make them stronger.'],
  rehartna: ['A sonic wave that stuns and lowers ATK.', 'Heals and shields the weakest ally, healing those near it.', 'Cuts allies’ cooldowns and gives them mana and ATK.', 'Heals everyone as the battle starts.'],
  shea: ['Heals all allies and cuts the damage they take.', 'Restores all allies’ mana and shortens their CC.', 'Hits every enemy and raises allies’ ATK.', 'Every 3rd skill heals everyone and starts a Trance.'],
  lavril: ['A ghostly hit: more M.DMG taken, less crit resistance.', 'Heals the top attacker and boosts its ATK and crit damage.', 'A spectral tornado that weakens and exposes.', 'Soul-links with the top attacker: ATK, penetration and mana.'],
  evan: ['Heals all allies and raises their Heal Rate.', 'A healing circle that speeds allies up.', 'Shields all allies, with mana and CC immunity.', 'Heals as the battle starts; switches between Green and Dark.'],
  estelle: ['Cleanses and heals all allies and makes them CC-immune.', 'Boosts the top ally’s crit damage and weakens the top enemy.', 'Allies attack faster, take less damage and heal.', 'Her attacks build up to restore every ally’s mana.'],
};

/** Skill `index` of a hero (its passive last) in a line: its brief, or its words' first sentence. */
export function skillBrief(hero: string, index: number, words: string): string {
  return SKILL_BRIEFS[hero]?.[index] ?? words.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? words;
}

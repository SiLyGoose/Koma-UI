/*
 * What this page and the Koma bot say to each other over the raid's WebSocket. A copy of the bot's
 * src/web/raid/protocol.ts (in the Koma repo): change both together.
 *
 * The raid is the server's weekly raid, the very one on its Discord message: a player on this page is
 * in the same lobby and fight as the ones pressing buttons in Discord.
 *
 *   page -> bot   hello    first message: the token from the link
 *                 start    starts this week's raid: its lobby goes up in the server's channel, with
 *                          them as the host
 *                 join     joins the lobby; `leave` leaves it
 *                 begin    the host starts the fight now, without waiting for the lobby to close
 *                 act      their action this turn (`target`: who a heal is for, left out to let the
 *                          bot choose)
 *   bot -> page   raid     the raid as it is now: whenever anything about it changes
 *                 answer   how a start, join, leave, begin or act went (`code` is 'ok' when it went)
 *                 error    and the bot closes the connection
 *
 * Text from the raid (the boss's next move, the log) is Discord markdown, as the raid message shows
 * it: **bold**, *italics*, <@id> mentions (named in `names`), and <:name:id> custom emojis.
 */

export type RaidAction = 'attack' | 'guard' | 'heal' | 'support';
export type RaidBossId = 'wyrm' | 'reaper';
export type CrowdControl = 'stunned' | 'disarmed' | 'taunted';
export type ActProblem = 'not_playing' | 'knocked_out' | CrowdControl;
export type RaidEnd = 'won' | 'wiped' | 'fled' | 'no_players' | 'called_off';

export type ClientMessage =
  | { t: 'hello'; token: string }
  | { t: 'start' }
  | { t: 'join' }
  | { t: 'leave' }
  | { t: 'begin' }
  | { t: 'act'; action: RaidAction; target?: string };

/** The boss's pictures: calm and angrier as it loses HP, and how the fight ended. */
export type RaidMood = 'calm' | 'enraged' | 'furious' | 'shielded' | 'defeated' | 'gloating' | 'fled';

export interface RaidPlayerView {
  userId: string;
  hp: number;
  maxHp: number;
  /** Their crowd control, while it lasts. */
  cc: { effect: CrowdControl; turns: number } | null;
  /** What they picked this turn (everyone sees everyone's, as in Discord). */
  picked: RaidAction | null;
  /** They can pick this turn (standing and not stunned). */
  canAct: boolean;
}

export interface RaidFightView {
  round: number;
  maxRounds: number;
  bossHp: number;
  bossMaxHp: number;
  /** 0 calm, 1 enraged, 2 furious. */
  enrage: number;
  shielded: boolean;
  /** Rounds of Support's attack boost left, and how big it is. */
  rallied: number;
  rallyMultiplier: number;
  /** What the boss does at the end of this turn (markdown). */
  intent: string;
  /** Taking picks, until `endsAt` (ms); false while the round is being resolved. */
  open: boolean;
  endsAt: number;
  players: RaidPlayerView[];
  /** The newest lines of the action log, oldest first (markdown). */
  log: string[];
  /** Why the one looking can't take each action this turn (null: they can). */
  problems: Record<RaidAction, ActProblem | null>;
}

export interface RaidOverView {
  end: RaidEnd;
  rounds: number;
  bossHp: number;
  bossMaxHp: number;
  /** Damage dealt, most first. */
  ranking: { userId: string; damage: number }[];
  /** What each raider did, in the order they joined: damage dealt, HP healed, and damage their guarding kept off the party. */
  players: { userId: string; damage: number; healed: number; mitigated: number }[];
  lastHit: string | null;
  /** The winners were paid this. */
  reward: { points: number; tokens: number; gems: number } | null;
}

export interface RaidView {
  /** The one looking. */
  you: string;
  /** Display names by user id, for the markdown's mentions and the lists. */
  names: Record<string, string>;
  /** Profile pictures by user id, when the bot knows them. */
  avatars: Record<string, string>;
  boss: { id: RaidBossId; name: string; emoji: string };
  /** The boss's picture now: its path under the bot's /api (GET). */
  picture: string;
  mood: RaidMood;
  /** When the week's raid resets (ms). */
  resetsAt: number;
  /**
   * `idle`: no raid going on. `week` is how this week's raid went ('open' when it hasn't been fought),
   * and `canStart` whether the page can start it (a server without a bot channel starts it in Discord).
   */
  phase: 'idle' | 'lobby' | 'fight' | 'over';
  idle: { week: 'open' | 'won' | 'wiped' | 'fled' | 'busy'; canStart: boolean } | null;
  lobby: { host: string; players: string[]; closesAt: number; bossHp: number } | null;
  fight: RaidFightView | null;
  over: RaidOverView | null;
}

/** What went wrong with a start, join, leave, begin or act. */
export type AnswerCode =
  | 'ok'
  | 'already_joined'
  | 'not_joined'
  | 'only_host'
  | 'closed'
  | ActProblem
  | 'late'
  | 'already'
  | 'no_raid'
  | 'no_channel'
  | 'busy'
  | 'raided'
  | 'started'
  | 'failed';

export type ErrorCode = 'bad_token' | 'bad_message' | 'replaced';

export type ServerMessage =
  | { t: 'raid'; view: RaidView }
  | { t: 'answer'; to: Exclude<ClientMessage['t'], 'hello'>; code: AnswerCode }
  | { t: 'error'; code: ErrorCode };

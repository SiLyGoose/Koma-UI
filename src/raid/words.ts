import type { ActProblem, AnswerCode } from './protocol';

export const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');
export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
export const CC_NAME = { stunned: '💫 Stunned', disarmed: '🗡️ Disarmed', taunted: '😤 Taunted' } as const;

/** Why they can't take an action this turn, in words. */
export function problemText(problem: ActProblem, turns: number): string {
  switch (problem) {
    case 'not_playing':
      return "You're not in this fight, but you can follow it here.";
    case 'knocked_out':
      return "You're knocked out. A heal can bring you back.";
    case 'stunned':
      return `You're stunned for ${plural(turns, 'more turn', 'more turns')}.`;
    case 'disarmed':
      return `You're disarmed: no attacking for ${plural(turns, 'more turn', 'more turns')}.`;
    case 'taunted':
      return `You're taunted: you can only attack for ${plural(turns, 'more turn', 'more turns')}.`;
  }
}

/** A start, join, leave, begin or act that didn't go through, in words (null: nothing to say). */
export function answerText(code: AnswerCode): string | null {
  switch (code) {
    case 'ok':
      return null;
    case 'already_joined':
      return "You're already in.";
    case 'not_joined':
      return "You haven't joined.";
    case 'only_host':
      return 'Only the host (first on the list) can start early.';
    case 'closed':
      return 'The fight has already started.';
    case 'late':
      return 'Too late: that turn is over.';
    case 'already':
      return 'You already picked this turn.';
    case 'no_raid':
      return 'There is no raid going on right now.';
    case 'no_channel':
      return "This server has no bot channel, so start the raid in Discord with the raid command.";
    case 'busy':
      return 'Something else is going on in the server (an event or another raid). Try again in a bit.';
    case 'raided':
      return "This week's raid has already been fought.";
    case 'started':
      return "This week's raid has already been started.";
    case 'failed':
      return 'Something went wrong. Try again in a moment.';
    default:
      return problemText(code, 1);
  }
}

import { el } from '../../shared/items';
import { loadGear } from './api';
import type { GearContext } from './context';
import { showMenu } from './foot';
import type { Member } from './types';

/** A Discord picture big enough to fill a roster portrait (the bot asks Discord for small ones). */
const bigAvatar = (url: string): string => (url.startsWith('https://cdn.discordapp.com/') ? url.replace(/([?&]size=)\d+/, '$1256') : url);

/** Down the left: everyone in the server with gear (or the raid's party), them first. Picking someone shows their gear. */
export function renderRoster(ctx: GearContext): void {
  const { ui, members, party } = ctx;
  ui.roster.hidden = members.length === 0;
  ui.rosterList.textContent = '';
  for (const member of members) {
    const shown = member.you && !party ? ctx.viewing === null : ctx.viewing?.userId === member.userId;
    // A portrait: their picture filling the square, their class's badge in its top left corner (no classes yet, so a
    // question mark, as on the stage's ribbon), how many items they own in its top right, their name along the bottom.
    const tile = el('button', 'roster-tile');
    tile.type = 'button';
    tile.classList.toggle('you', member.you);
    tile.setAttribute('aria-current', String(shown));
    const count = member.copies === undefined ? '' : `${member.copies} item${member.copies === 1 ? '' : 's'}`;
    tile.setAttribute('aria-label', [member.you ? `You (${member.name})` : member.name, count].filter(Boolean).join(', '));
    tile.title = [member.name, count].filter(Boolean).join(' · ');
    const avatar = el('img', 'roster-avatar');
    avatar.src = bigAvatar(member.avatar);
    avatar.alt = '';
    avatar.loading = 'lazy';
    const badge = el('span', 'roster-class', '?');
    badge.title = 'Class: ?';
    badge.setAttribute('aria-hidden', 'true');
    tile.append(avatar, badge);
    if (member.copies !== undefined) tile.append(el('span', 'roster-count', String(member.copies)));
    tile.append(el('span', 'roster-name', member.you ? 'You' : member.name));
    tile.addEventListener('click', () => {
      if (shown) return;
      ctx.viewing = member.you && !party ? null : member;
      ctx.picked = null;
      ctx.selling = null;
      ctx.filter = 'all';
      showMenu(ctx, false);
      renderRoster(ctx);
      void loadGear(ctx);
    });
    ui.rosterList.append(tile);
  }
}

/** The roster. A bot from before it has none to give: the page is then just their own gear, as before. */
export async function loadMembers(ctx: GearContext): Promise<void> {
  const server = ctx.host.server();
  if (!server) return;
  const res = await ctx.host.api<{ members: Member[] }>(`/api/gear/members?guild=${encodeURIComponent(server)}`);
  if (server !== ctx.host.server()) return;
  ctx.members = res.ok ? res.data.members : [];
  renderRoster(ctx);
}

import '../shared/style.css';
import '../shared/items/items.css';
import '../gear/gear.css';
import './gear.css';
import markup from '../gear/gear.html?raw';
import { backdrop } from '../shared/backdrop';
import { installCursor } from '../shared/cursor';
import { keepHoloInStep } from '../shared/items/items';
import { apiFromSocket } from '../shared/live';
import { mountGear, type ApiResult, type Member } from '../gear/view';

/*
 * The raid party's gear, in the raid page's popup (an iframe: its own screen, so the gear page's layout,
 * which goes by the screen's width, is laid out as on a computer and scaled down to fit a phone on its
 * side). The gear page's view (../gear/view.ts), with the party for its roster, to look at only.
 *
 * Its link's #hash: the raid's token (t) and socket (s), the party (p: JSON [{ id, name, avatar }], in
 * the order they joined, the one looking marked `you`), whose gear to show first (w), and g=raid for
 * their gear as they fought the raid (the end screen: the bot's snapshot) rather than now. Escape, with
 * nothing open in the view to close, asks the raid page to close the popup.
 */

interface PartyMember {
  id: string;
  name: string;
  avatar?: string;
  you?: boolean;
}

const params = new URLSearchParams(location.hash.slice(1));
const token = params.get('t') ?? '';
const socket = params.get('s') ?? '';
let party: PartyMember[] = [];
try {
  party = JSON.parse(params.get('p') ?? '[]') as PartyMember[];
} catch {
  party = [];
}
const base = socket ? apiFromSocket(socket) : '';
/** Their gear as they fought (GET /api/raid/gear), not as it is now. */
const fought = params.get('g') === 'raid';

/** Discord's default picture, for someone whose own the bot doesn't know. */
const DEFAULT_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png';

async function api<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    // As they fought: the raid's snapshot, asked for the same way.
    if (fought) path = path.replace(/^\/api\/gear\?/, '/api/raid/gear?');
    const res = await fetch(`${base}${path}`, { ...init, headers: { Authorization: `Game ${token}`, ...init.headers } });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return res.ok ? { ok: true, data: body as T } : { ok: false, status: res.status, error: body.error ?? 'failed' };
  } catch {
    return { ok: false, status: 0, error: 'offline' };
  }
}

document.body.prepend(backdrop());
// The games' hand in place of the mouse pointer here too (the raid page's stops at the frame's edge).
installCursor({ reticle: false });
keepHoloInStep();

// Before the view's own Escape (which closes what's open in it): with nothing open, the popup goes.
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const open = document.querySelector('#detail:not([hidden]), #loadout-menu:not([hidden]), dialog[open]');
  if (!open) parent.postMessage({ t: 'close-gear' }, location.origin);
});

const view = document.getElementById('view') as HTMLElement;
view.innerHTML = markup;
const root = view.firstElementChild as HTMLElement;
const title = root.querySelector('.roster-title');
if (title) title.textContent = 'Party';
root.querySelector('#roster')?.setAttribute('aria-label', 'Party');

const members: Member[] = party.map((m) => ({ userId: m.id, name: m.name, avatar: m.avatar || DEFAULT_AVATAR, you: m.you === true }));
mountGear(root, {
  api,
  ready: !!token && !!base,
  me: () => null,
  loadMe: async () => ({ ok: true, data: null }),
  server: () => null,
  setServer: () => undefined,
  logOut: () => undefined,
  go: () => undefined,
  party: { members, first: params.get('w') ?? members[0]?.userId ?? '' },
});

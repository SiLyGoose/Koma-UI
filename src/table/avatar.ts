import type { SeatView } from './protocol';

/** A player's profile picture, their name on hover. */
export function avatarImg(seat: SeatView, className: string): HTMLImageElement {
  const img = document.createElement('img');
  img.className = className;
  img.src = seat.avatar;
  img.alt = '';
  img.title = seat.name;
  img.referrerPolicy = 'no-referrer';
  img.draggable = false;
  return img;
}

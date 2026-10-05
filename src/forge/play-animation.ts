import { replay } from '../shared/replay';

/**
 * Plays an animation on `box` (`className` starts it, from the top even when it's already going),
 * and takes the class off once `animation` ends, so drawing the slot again doesn't play it again.
 */
export function playAnimation(box: HTMLElement, className: string, animation: string): void {
  replay(box, className);
  const end = (event: AnimationEvent): void => {
    if (event.animationName !== animation) return;
    box.classList.remove(className);
    box.removeEventListener('animationend', end);
  };
  box.addEventListener('animationend', end);
}

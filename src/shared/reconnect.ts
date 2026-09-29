import './reconnect.css';

/*
 * "Reconnecting…": an overlay that fades in over the whole site while the bot isn't answering (the
 * site's api(), ../site/session.ts, keeps trying under it), blurring the page, with the loading
 * screen's sprite bouncing over the words. One for the whole document, kept up for as long as anything
 * is still waiting on the bot.
 */

let overlay: HTMLElement | null = null;
/** How many requests are waiting for the bot to answer again: the overlay is up while any are. */
let waiting = 0;

function build(): HTMLElement {
  const box = document.createElement('div');
  box.className = 'reconnect';
  box.setAttribute('role', 'status');
  box.setAttribute('aria-live', 'polite');
  box.innerHTML =
    '<div class="reconnect-box"><div class="reconnect-sprite" aria-hidden="true"></div>' +
    '<div class="reconnect-shadow" aria-hidden="true"></div><p class="reconnect-text">Reconnecting…</p></div>';
  document.body.append(box);
  // Drawn hidden first, so turning it on fades it in.
  void box.offsetWidth;
  return box;
}

/** Puts the overlay up (or keeps it up) until the function it returns is called. */
export function reconnecting(): () => void {
  overlay ??= build();
  waiting++;
  overlay.classList.add('on');
  let done = false;
  return () => {
    if (done) return;
    done = true;
    if (--waiting === 0) overlay?.classList.remove('on');
  };
}

// Put at the end of every page's <head> by vite.config.ts, before the page is drawn (transition/
// does the rest). The page starts under the loading screen, as the page before ended, when it was
// arrived at through a transition, or by going back or forward (the wipe then runs the other way),
// until transition/ wipes it away. It also picks the loading screen's sprite. Nothing for anyone
// who asked for less motion.
try {
  (function () {
    var root = document.documentElement;
    // The loading screen's sprites: the characters' glowing silhouettes (public/characters/<id>/,
    // made by scripts/silhouette.py; the characters are in characters.ts), one at random.
    var SPRITES = ['/characters/tsuri/silhouette.png'];
    root.style.setProperty('--tx-sprite', 'url(' + SPRITES[Math.floor(Math.random() * SPRITES.length)] + ')');
    // The bounce keeps time with the clock (a bounce up and down a second), so this page's loading
    // screen takes it up at the height the page before left it.
    root.style.setProperty('--tx-phase', -(Date.now() % 1000) + 'ms');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var t = JSON.parse(sessionStorage.getItem('koma.transition') || 'null');
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (t && t.to === location.pathname.replace(/\/+$/, '') && Date.now() - t.at < 5000) {
      root.setAttribute('data-tx', 'cover');
      root.setAttribute('data-tx-dir', t.dir);
    } else if (nav && nav.type === 'back_forward') {
      root.setAttribute('data-tx', 'cover');
      root.setAttribute('data-tx-dir', 'back');
    }
  })();
} catch (e) {
  // No storage: no transition.
}

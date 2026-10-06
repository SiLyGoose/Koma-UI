/** Where the page being left says where it's going, for the next one (sessionStorage). */
export const KEY = 'koma.transition';
/** The wipe on or off (transition/head.css's animations are this long). */
export const WIPE_MS = 800;
/** The loading screen shows at least this long before going, while the next page is fetched. */
export const LOAD_MS = 1000;
/** The longest the page being left waits for the next one to be fetched. */
export const MAX_FETCH_MS = 2000;
/** The longest the reveal waits for a page to draw itself (holdReveal). */
export const MAX_HOLD_MS = 3000;
/**
 * A page just loaded goes on working for a moment after it has drawn itself (the browser putting the
 * whole of it on screen for the first time: the star chart, the pictures), stalling frames as it does.
 * The wipe waits for that to be over, so it doesn't stutter: for this many frames in a row coming at
 * least this often, and no longer than the last.
 */
export const SETTLE_FRAMES = 5;
export const SETTLE_FRAME_MS = 25;
export const MAX_SETTLE_MS = 1000;
/** Swapping a site page, the loading screen shows at least this long, so it doesn't just flicker. */
export const MIN_SWAP_MS = 300;
/** The quick cover's wipe on or off (curtain(): transition/head.css's at twice the speed). */
export const FAST_WIPE_MS = 400;

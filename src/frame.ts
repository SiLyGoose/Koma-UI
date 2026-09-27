import './frame.css';

/*
 * The frame every game sits in: a blue border round the window and a title bar across the top. Its
 * markup is in each game's page, so it shows before any script runs:
 *
 *   <main class="frame …">
 *     <header class="top">
 *       <a class="back" href="/" aria-label="Back to the games">←</a>
 *       <h1>💎 Mines</h1>
 *       <button type="button" id="mute" class="frame-mute" aria-label="Turn sound off" aria-pressed="false">🔊</button>
 *       <span id="conn" class="conn">Connecting…</span>
 *     </header>
 *     …the game…
 *
 * This works its sound button and connection pill.
 */

/** Shows how the connection to the bot is doing, in the title bar. */
export function setConn(text: string, kind: '' | 'ok' | 'bad'): void {
  const conn = document.getElementById('conn') as HTMLElement;
  conn.textContent = text;
  conn.className = `conn ${kind}`;
}

/**
 * The sound button: shows whether sound is off and remembers it (in storage under `key`, so each
 * game has its own), telling `onChange` straight away and on every click.
 */
export function soundButton(key: string, onChange: (muted: boolean) => void): void {
  const button = document.getElementById('mute') as HTMLButtonElement;
  let muted = false;
  try {
    muted = localStorage.getItem(key) === '1';
  } catch {
    // No storage (a private window): sound starts on.
  }
  const render = (): void => {
    button.textContent = muted ? '🔇' : '🔊';
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
  };
  button.addEventListener('click', () => {
    muted = !muted;
    try {
      localStorage.setItem(key, muted ? '1' : '0');
    } catch {
      // Not remembered, but still off for now.
    }
    render();
    onChange(muted);
  });
  render();
  onChange(muted);
}

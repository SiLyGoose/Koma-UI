/* The box over a game that says why it can't go on (#message in every game's page), with the way home. */

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

export function showMessage(title: string, text: string): void {
  $('message-title').textContent = title;
  $('message-text').textContent = text;
  $('message').hidden = false;
}

export function hideMessage(): void {
  $('message').hidden = true;
}

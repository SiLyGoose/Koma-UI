/** Gear powder (King's Raid's Magic Powder: what selling hero gear pays), to go after an amount as the coin does. */
export function powder(className = 'coin', alt = 'Gear Powder'): HTMLImageElement {
  const img = document.createElement('img');
  img.src = '/kr/ui/gear-powder.webp';
  img.alt = alt;
  img.title = 'Gear Powder';
  img.className = className;
  return img;
}

/** The bot's currency, :zeiucoin:, to go after an amount. */
export function coin(className = 'coin', alt = 'zeiucoins'): HTMLImageElement {
  const img = document.createElement('img');
  img.src = `${import.meta.env.BASE_URL}shared/zeiucoin.png`;
  img.alt = alt;
  img.className = className;
  return img;
}

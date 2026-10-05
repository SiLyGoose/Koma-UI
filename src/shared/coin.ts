/** The bot's currency, :zeiucoin:, to go after an amount. */
export function coin(className = 'coin', alt = 'zeiucoin'): HTMLImageElement {
  const img = document.createElement('img');
  img.src = `${import.meta.env.BASE_URL}shared/zeiucoin.png`;
  img.alt = alt;
  img.className = className;
  return img;
}

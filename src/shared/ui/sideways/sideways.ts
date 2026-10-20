/**
 * A row that scrolls sideways (the shop's cards): a mouse's wheel, turned up or down, scrolls it along too, while it has
 * more than it shows (a trackpad's sideways swipe scrolls it as usual).
 */
export function wheelSideways(row: HTMLElement): void {
  row.addEventListener(
    'wheel',
    (event) => {
      if (row.scrollWidth <= row.clientWidth || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      row.scrollBy({ left: event.deltaY });
    },
    { passive: false },
  );
}

/** A round top for the scale over `max`, and the step between its lines (1, 2 or 5 times a power of ten, about five of them). */
export function niceScale(max: number): { top: number; step: number } {
  if (max <= 0) return { top: 10, step: 2 };
  const rough = max / 5;
  const power = 10 ** Math.floor(Math.log10(rough));
  const f = rough / power;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * power;
  return { top: Math.ceil(max / step) * step, step };
}

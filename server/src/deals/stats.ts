/** Statistiche minime, robuste agli outlier: i listini alberghieri ne sono pieni. */

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  if (sorted.length % 2 === 1) return sorted[mid] as number;
  return (((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2);
}

/** Percentile con interpolazione lineare. `p` in [0,1]. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0] as number;
  const pos = clamp(p, 0, 1) * (sorted.length - 1);
  const low = Math.floor(pos);
  const high = Math.ceil(pos);
  const lowValue = sorted[low] as number;
  if (low === high) return lowValue;
  const highValue = sorted[high] as number;
  return lowValue + (highValue - lowValue) * (pos - low);
}

/** Quota di valori sotto `value`, in [0,1]. Zero campioni -> 0.5 (neutro). */
export function percentileRank(values: readonly number[], value: number): number {
  if (values.length === 0) return 0.5;
  let below = 0;
  for (const v of values) if (v < value) below += 1;
  return below / values.length;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Mediana calcolata scartando le code, quando i campioni bastano. */
export function trimmedMedian(values: readonly number[], trim = 0.1): number {
  if (values.length < 5) return median(values);
  const sorted = [...values].sort((a, b) => a - b);
  const cut = Math.floor(sorted.length * trim);
  return median(sorted.slice(cut, sorted.length - cut));
}

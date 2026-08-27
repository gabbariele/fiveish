/**
 * Generatore pseudo-casuale deterministico. Serve al provider dimostrativo:
 * la stessa combinazione hotel/data produce sempre lo stesso prezzo, cosi' lo
 * storico che accumuliamo e' coerente fra una scansione e l'altra.
 */
export function makeRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = (h ^= h >>> 16) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T;
}

export function between(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

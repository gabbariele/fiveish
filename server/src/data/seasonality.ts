import type { DestinationKind } from '../types.js';

/**
 * Moltiplicatore stagionale del prezzo, per tipo di destinazione, mese per mese
 * (indice 0 = gennaio). Serve a due cose: generare il dataset dimostrativo e,
 * soprattutto, a costruire il prezzo di riferimento quando lo storico e' corto.
 * Senza stagionalita' un agosto a Positano sembrerebbe un rincaro; e' solo agosto.
 */
export const seasonality: Record<DestinationKind, number[]> = {
  citta:    [0.75, 0.80, 0.95, 1.15, 1.25, 1.15, 0.95, 0.80, 1.20, 1.15, 0.85, 0.95],
  mare:     [0.45, 0.45, 0.55, 0.80, 1.00, 1.30, 1.60, 1.90, 1.25, 0.80, 0.50, 0.50],
  montagna: [1.50, 1.60, 1.30, 0.70, 0.50, 0.70, 1.00, 1.30, 0.80, 0.60, 0.60, 1.50],
  lago:     [0.55, 0.60, 0.75, 1.00, 1.20, 1.30, 1.35, 1.40, 1.20, 0.90, 0.60, 0.60],
  borgo:    [0.60, 0.65, 0.80, 1.05, 1.25, 1.30, 1.20, 1.25, 1.30, 1.10, 0.70, 0.70],
};

/** Moltiplicatore per il mese di una data ISO (YYYY-MM-DD). */
export function seasonalFactor(kind: DestinationKind, isoDate: string): number {
  const month = Number(isoDate.slice(5, 7)) - 1;
  const curve = seasonality[kind];
  return curve[month] ?? 1;
}

/** Il weekend costa di piu' ovunque, in citta' meno che sui laghi. */
export function weekendFactor(isoDate: string, kind: DestinationKind): number {
  const day = new Date(`${isoDate}T12:00:00Z`).getUTCDay();
  const isWeekend = day === 5 || day === 6;
  if (!isWeekend) return 1;
  return kind === 'citta' ? 1.08 : 1.18;
}

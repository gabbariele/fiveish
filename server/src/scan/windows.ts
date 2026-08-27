import type { SearchWindow } from '../types.js';

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Sposta la data al venerdi successivo (o la lascia se e' gia' venerdi). */
function nextFriday(date: Date): Date {
  const delta = (5 - date.getUTCDay() + 7) % 7;
  return addDays(date, delta);
}

/**
 * Tre modi di andare in hotel, tre modi di trovare un'occasione: il weekend
 * lungo, la pausa infrasettimanale (dove i 5 stelle di citta' svendono) e la
 * settimana piena (dove svendono quelli di mare e montagna).
 */
const PATTERNS: Array<{ nights: number; anchor: 'venerdi' | 'lunedi' }> = [
  { nights: 2, anchor: 'venerdi' },
  { nights: 3, anchor: 'lunedi' },
  { nights: 7, anchor: 'venerdi' },
];

/**
 * Costruisce le finestre di date da interrogare, distribuite sull'orizzonte
 * di ricerca. Non ha senso chiedere al provider tutte le date possibili:
 * poche finestre ben scelte trovano le stesse occasioni a un decimo del costo.
 */
export function buildWindows(options: {
  now?: Date;
  count?: number;
  horizonDays?: number;
  guests?: number;
}): SearchWindow[] {
  const now = options.now ?? new Date();
  const count = Math.max(1, options.count ?? 6);
  const horizon = Math.max(7, options.horizonDays ?? 120);
  const guests = options.guests ?? 2;

  const windows: SearchWindow[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < count; i += 1) {
    const offset = Math.round((horizon * (i + 1)) / (count + 1));
    const pattern = PATTERNS[i % PATTERNS.length] as (typeof PATTERNS)[number];
    let start = addDays(now, Math.max(3, offset));
    start = pattern.anchor === 'venerdi' ? nextFriday(start) : addDays(nextFriday(start), 3);

    const checkIn = toIso(start);
    const checkOut = toIso(addDays(start, pattern.nights));
    const key = `${checkIn}|${checkOut}`;
    if (seen.has(key)) continue;
    seen.add(key);
    windows.push({ checkIn, checkOut, guests });
  }

  return windows;
}

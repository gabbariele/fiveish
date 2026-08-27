import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Deal, ScanSummary, Watch } from '../types.js';

/** Quante date distinte teniamo in memoria per ogni hotel. */
const HISTORY_CAP = 180;

export interface Observation {
  /** Prezzo a notte rilevato, in EUR. */
  price: number;
  /** Quando lo abbiamo visto. */
  at: string;
}

interface Persisted {
  version: 1;
  /**
   * hotelId -> data di arrivo -> ultima rilevazione.
   *
   * La chiave e' la data di arrivo, non un progressivo: riscansionare la stessa
   * notte aggiorna il prezzo invece di aggiungerne uno. Senza questo, ripassare
   * dieci volte sulle stesse date gonfierebbe lo storico di copie identiche e
   * ci farebbe credere di avere dieci prove dove ne abbiamo una.
   */
  history: Record<string, Record<string, Observation>>;
  deals: Deal[];
  watches: Watch[];
  firstSeen: Record<string, string>;
  /** "destinationId|mese" -> due righe di contesto sulla meta in quel periodo. */
  notes: Record<string, string>;
  lastScan?: ScanSummary;
}

const empty = (): Persisted => ({
  version: 1,
  history: {},
  deals: [],
  watches: [],
  firstSeen: {},
  notes: {},
});

export function dealKey(hotelId: string, checkIn: string, checkOut: string): string {
  return `${hotelId}|${checkIn}|${checkOut}`;
}

/**
 * Persistenza su singolo file JSON. Il volume in gioco (qualche migliaio di
 * osservazioni) non giustifica un database: tutto sta in memoria e viene
 * scritto su disco in modo atomico.
 */
export class Store {
  private data: Persisted = empty();
  private readonly file: string;
  private flushTimer: NodeJS.Timeout | undefined;

  constructor(private readonly dir: string) {
    this.file = join(dir, 'fiveish.json');
    this.load();
  }

  private load(): void {
    try {
      const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as Persisted;
      if (parsed?.version === 1) {
        this.data = { ...empty(), ...parsed };
        return;
      }
    } catch {
      // Primo avvio o file illeggibile: si riparte da zero, senza drammi.
    }
    this.data = empty();
  }

  flush(): void {
    mkdirSync(this.dir, { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data), 'utf8');
    renameSync(tmp, this.file);
  }

  /** Scrittura differita: le scansioni toccano il disco una volta sola. */
  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined;
      this.flush();
    }, 1000);
    this.flushTimer.unref?.();
  }

  // --- Storico prezzi ---

  recordObservation(hotelId: string, checkIn: string, nightlyPrice: number, at?: string): void {
    if (!Number.isFinite(nightlyPrice) || nightlyPrice <= 0) return;
    const perHotel = (this.data.history[hotelId] ??= {});
    perHotel[checkIn] = { price: Math.round(nightlyPrice), at: at ?? new Date().toISOString() };

    const dates = Object.keys(perHotel);
    if (dates.length > HISTORY_CAP) {
      // Si scartano le rilevazioni piu' vecchie: il mercato di un anno fa non ci serve.
      const oldest = dates
        .sort((a, b) => (perHotel[a]?.at ?? '').localeCompare(perHotel[b]?.at ?? ''))
        .slice(0, dates.length - HISTORY_CAP);
      for (const date of oldest) delete perHotel[date];
    }
    this.scheduleFlush();
  }

  /** Prezzi rilevati per quell'hotel con arrivo nel mese indicato ("01".."12"). */
  observations(hotelId: string, month: string): number[] {
    const perHotel = this.data.history[hotelId];
    if (!perHotel) return [];
    const prices: number[] = [];
    for (const [checkIn, observation] of Object.entries(perHotel)) {
      if (checkIn.slice(5, 7) === month) prices.push(observation.price);
    }
    return prices;
  }

  /** Tutte le rilevazioni di un hotel, indipendentemente dal mese. */
  allObservations(hotelId: string): number[] {
    const perHotel = this.data.history[hotelId];
    if (!perHotel) return [];
    return Object.values(perHotel).map((o) => o.price);
  }

  historySize(): number {
    let total = 0;
    for (const perHotel of Object.values(this.data.history)) {
      total += Object.keys(perHotel).length;
    }
    return total;
  }

  // --- Offerte ---

  /** Registra la prima volta che abbiamo visto un'offerta, per marcare le novita'. */
  markFirstSeen(key: string, at: string): string {
    const existing = this.data.firstSeen[key];
    if (existing) return existing;
    this.data.firstSeen[key] = at;
    this.scheduleFlush();
    return at;
  }

  isKnown(key: string): boolean {
    return this.data.firstSeen[key] !== undefined;
  }

  setDeals(deals: Deal[]): void {
    this.data.deals = deals;
    this.scheduleFlush();
  }

  getDeals(): Deal[] {
    return this.data.deals;
  }

  // --- Avvisi salvati ---

  getWatches(): Watch[] {
    return this.data.watches;
  }

  addWatch(watch: Watch): Watch {
    this.data.watches.push(watch);
    this.scheduleFlush();
    return watch;
  }

  updateWatch(id: string, patch: Partial<Watch>): Watch | undefined {
    const watch = this.data.watches.find((w) => w.id === id);
    if (!watch) return undefined;
    Object.assign(watch, patch);
    this.scheduleFlush();
    return watch;
  }

  removeWatch(id: string): boolean {
    const before = this.data.watches.length;
    this.data.watches = this.data.watches.filter((w) => w.id !== id);
    const removed = this.data.watches.length !== before;
    if (removed) this.scheduleFlush();
    return removed;
  }

  // --- Note sulle destinazioni ---

  getNote(destinationId: string, month: string): string | undefined {
    return this.data.notes[`${destinationId}|${month}`];
  }

  setNote(destinationId: string, month: string, text: string): void {
    this.data.notes[`${destinationId}|${month}`] = text;
    this.scheduleFlush();
  }

  noteCount(): number {
    return Object.keys(this.data.notes).length;
  }

  // --- Scansioni ---

  setLastScan(summary: ScanSummary): void {
    this.data.lastScan = summary;
    this.scheduleFlush();
  }

  getLastScan(): ScanSummary | undefined {
    return this.data.lastScan;
  }
}

import { config } from '../config.js';
import { destinations as allDestinations } from '../data/destinations.js';
import { PriceIndex } from '../deals/baseline.js';
import { evaluate } from '../deals/score.js';
import type { Store } from '../store/store.js';
import { dealKey } from '../store/store.js';
import type {
  Deal,
  Destination,
  Hotel,
  Offer,
  PriceProvider,
  ScanSummary,
  SearchWindow,
} from '../types.js';
import { buildWindows } from './windows.js';

export interface ScanOptions {
  destinations?: Destination[];
  windows?: SearchWindow[];
  now?: Date;
  concurrency?: number;
}

export interface ScanResult {
  summary: ScanSummary;
  deals: Deal[];
  newDeals: Deal[];
}

/**
 * Una scansione e' una passata completa: interroga il provider su tutte le
 * combinazioni destinazione x finestra, aggiorna lo storico dei prezzi e poi
 * — solo dopo, con l'indice completo in mano — giudica le offerte.
 *
 * L'ordine conta: valutare mentre si raccoglie significherebbe giudicare le
 * prime offerte senza sapere quanto costano le altre.
 */
export class Scanner {
  constructor(
    private readonly provider: PriceProvider,
    private readonly store: Store,
  ) {}

  async run(options: ScanOptions = {}): Promise<ScanResult> {
    const startedAt = new Date();
    const now = options.now ?? startedAt;
    const destinations = options.destinations ?? allDestinations;
    const windows =
      options.windows ??
      buildWindows({
        now,
        count: config.scan.windowsPerDestination,
        horizonDays: config.scan.horizonDays,
      });

    const tasks: Array<{ destination: Destination; window: SearchWindow }> = [];
    for (const destination of destinations) {
      for (const window of windows) tasks.push({ destination, window });
    }

    const errors: string[] = [];
    const hotels = new Map<string, Hotel>();
    const collected: Array<{ offer: Offer; hotel: Hotel; destination: Destination }> = [];
    const index = new PriceIndex(this.store);

    await mapWithConcurrency(
      tasks,
      options.concurrency ?? config.scan.concurrency,
      async ({ destination, window }) => {
        try {
          const { hotels: found, offers } = await this.provider.search({ destination, window });
          for (const hotel of found) {
            // Difesa in profondita': il provider dovrebbe filtrare, noi verifichiamo.
            if (hotel.stars !== 5) continue;
            hotels.set(hotel.id, hotel);
          }
          for (const offer of offers) {
            const hotel = hotels.get(offer.hotelId);
            if (!hotel) continue;
            index.observe(hotel, destination, offer);
            collected.push({ offer, hotel, destination });
          }
        } catch (error) {
          errors.push(
            `${destination.name} ${window.checkIn}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      },
    );

    const observedAtIso = startedAt.toISOString();

    // Il giudizio viene PRIMA di aggiornare lo storico. Se registrassimo adesso,
    // il prezzo scontato entrerebbe nel riferimento contro cui lo stiamo
    // misurando: lo sconto si mangerebbe da solo e la frase "sotto il suo prezzo
    // abituale" diventerebbe circolare.
    const best = new Map<string, Deal>();
    for (const { offer, hotel, destination } of collected) {
      const { deal } = evaluate(offer, hotel, destination, index, { now });
      if (!deal) continue;
      const key = dealKey(hotel.id, offer.checkIn, offer.checkOut);
      const previous = best.get(key);
      if (!previous || deal.score > previous.score) best.set(key, deal);
    }

    // Ora si', lo storico assorbe tutto quello che abbiamo visto: non solo le
    // occasioni, perche' e' il prezzo pieno a rendere riconoscibile lo sconto
    // della prossima volta. Di piu' tariffe per la stessa notte teniamo la piu'
    // bassa, che e' quella che una persona pagherebbe davvero.
    const cheapest = new Map<string, { hotelId: string; checkIn: string; price: number }>();
    for (const { offer } of collected) {
      const key = `${offer.hotelId}|${offer.checkIn}`;
      const current = cheapest.get(key);
      if (!current || offer.nightlyPrice < current.price) {
        cheapest.set(key, {
          hotelId: offer.hotelId,
          checkIn: offer.checkIn,
          price: offer.nightlyPrice,
        });
      }
    }
    for (const { hotelId, checkIn, price } of cheapest.values()) {
      this.store.recordObservation(hotelId, checkIn, price, observedAtIso);
    }

    const deals: Deal[] = [];
    const newDeals: Deal[] = [];
    for (const [key, deal] of best) {
      const isNew = !this.store.isKnown(key);
      deal.firstSeenAt = this.store.markFirstSeen(key, observedAtIso);
      deals.push(deal);
      if (isNew) newDeals.push(deal);
    }

    deals.sort((a, b) => b.score - a.score);
    newDeals.sort((a, b) => b.score - a.score);
    this.store.setDeals(deals);

    const finishedAt = new Date();
    const summary: ScanSummary = {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      provider: this.provider.name,
      queries: tasks.length,
      offersSeen: collected.length,
      hotelsSeen: hotels.size,
      dealsFound: deals.length,
      newDeals: newDeals.length,
      errors,
    };
    this.store.setLastScan(summary);
    this.store.flush();

    return { summary, deals, newDeals };
  }
}

/** Esegue i task in parallelo, ma senza sommergere il provider di chiamate. */
async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const size = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;
  const runners = Array.from({ length: size }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      if (item === undefined) continue;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

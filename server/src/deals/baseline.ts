import { config } from '../config.js';
import type { Store } from '../store/store.js';
import type { Baseline, Destination, Hotel, Offer } from '../types.js';
import { seasonalFactor } from '../data/seasonality.js';
import { clamp, median, percentileRank, trimmedMedian } from './stats.js';

/**
 * Il prezzo di riferimento e' il cuore del prodotto: senza un "normale"
 * credibile, lo "sconto" e' solo marketing. Non usiamo mai il prezzo barrato
 * dichiarato dal venditore; ricostruiamo noi il normale, in quest'ordine:
 *
 *   1. storico     - i prezzi che abbiamo osservato per quell'hotel in quel mese
 *   2. profilo     - la mediana mensile nota per quella struttura
 *   3. concorrenti - i 5 stelle della stessa destinazione nello stesso mese
 *
 * Ogni scalino perde affidabilita', e un'affidabilita' bassa alza le soglie
 * richieste per pubblicare l'offerta.
 */
export class PriceIndex {
  /** destinationId|mese -> prezzi a notte visti in questa scansione. */
  private readonly peers = new Map<string, number[]>();
  private readonly ratings = new Map<string, number[]>();

  constructor(private readonly store: Store) {}

  private static key(destinationId: string, month: string): string {
    return `${destinationId}|${month}`;
  }

  /** Alimenta l'indice con quanto visto adesso, prima di giudicare le offerte. */
  observe(hotel: Hotel, destination: Destination, offer: Offer): void {
    const month = offer.checkIn.slice(5, 7);
    const key = PriceIndex.key(destination.id, month);
    const bucket = this.peers.get(key) ?? [];
    bucket.push(offer.nightlyPrice);
    this.peers.set(key, bucket);

    const ratingBucket = this.ratings.get(destination.id) ?? [];
    ratingBucket.push(hotel.guestRating);
    this.ratings.set(destination.id, ratingBucket);
  }

  peerPrices(destinationId: string, month: string): number[] {
    return this.peers.get(PriceIndex.key(destinationId, month)) ?? [];
  }

  /** Posizione del prezzo dentro il mercato locale: 0 = il piu' economico. */
  peerRank(destinationId: string, month: string, nightly: number): number {
    return percentileRank(this.peerPrices(destinationId, month), nightly);
  }

  private peerBaseline(hotel: Hotel, destination: Destination, month: string): number {
    const prices = this.peerPrices(destination.id, month).filter((p) => p > 0);
    if (prices.length < 3) return 0;
    const marketMedian = median(prices);
    const localRatings = this.ratings.get(destination.id) ?? [];
    const avgRating = localRatings.length > 0 ? median(localRatings) : hotel.guestRating;
    // Una struttura piu' amata della media locale costa di piu': lo mettiamo in conto
    // invece di confrontare un Relais & Chateaux con l'hotel congressuale accanto.
    const positioning = clamp(1 + (hotel.guestRating - avgRating) * 0.25, 0.7, 1.5);
    return marketMedian * positioning;
  }

  /** Ripiego finale: storico di altri mesi, riportato al mese richiesto. */
  private crossMonthBaseline(hotel: Hotel, destination: Destination, checkIn: string): number {
    const all = this.store.allObservations(hotel.id);
    if (all.length < 3) return 0;
    const overall = trimmedMedian(all);
    const factorNow = seasonalFactor(destination.kind, checkIn);
    // La mediana su tutti i mesi vale circa la stagionalita' media dell'anno.
    return overall * (factorNow / 1);
  }

  baselineFor(hotel: Hotel, destination: Destination, offer: Offer): Baseline {
    const month = offer.checkIn.slice(5, 7);
    const history = this.store.observations(hotel.id, month);
    const profile = hotel.priceProfile?.[month] ?? 0;

    if (history.length >= 4) {
      const confidence =
        history.length >= config.deals.minSamplesForHighConfidence ? 'alta' : 'media';
      return {
        nightly: trimmedMedian(history),
        method: 'storico',
        confidence,
        samples: history.length,
      };
    }

    if (history.length > 0 && profile > 0) {
      // Poche osservazioni: le pesiamo insieme al profilo noto invece di fidarci
      // di due sole rilevazioni.
      const weight = history.length / 4;
      const blended = median(history) * weight + profile * (1 - weight);
      return { nightly: blended, method: 'storico', confidence: 'media', samples: history.length };
    }

    if (profile > 0) {
      return { nightly: profile, method: 'profilo', confidence: 'media', samples: 0 };
    }

    const peer = this.peerBaseline(hotel, destination, month);
    if (peer > 0) {
      const samples = this.peerPrices(destination.id, month).length;
      return { nightly: peer, method: 'concorrenti', confidence: 'bassa', samples };
    }

    const cross = this.crossMonthBaseline(hotel, destination, offer.checkIn);
    if (cross > 0) {
      return { nightly: cross, method: 'storico', confidence: 'bassa', samples: 0 };
    }

    // Nessun riferimento: il prezzo e' pari a se stesso, cioe' sconto zero.
    // L'offerta verra' scartata, ed e' la scelta giusta: non sappiamo se e' un affare.
    return { nightly: offer.nightlyPrice, method: 'concorrenti', confidence: 'bassa', samples: 0 };
  }

  /** Il minimo mai osservato per quell'hotel in quel mese (0 se non ne abbiamo). */
  historicalLow(hotelId: string, month: string): number {
    const history = this.store.observations(hotelId, month);
    if (history.length < 3) return 0;
    return Math.min(...history);
  }
}

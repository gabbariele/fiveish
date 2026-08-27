import { sampleHotelsByDestination } from '../data/hotels.js';
import { seasonalFactor, weekendFactor } from '../data/seasonality.js';
import type { BoardType, Hotel, Offer, PriceProvider, ProviderQuery } from '../types.js';
import { between, makeRandom, pick } from './random.js';

const ROOMS = [
  'Camera Deluxe',
  'Camera Superior vista',
  'Junior Suite',
  'Camera Prestige',
  'Suite Executive',
];

const BOARDS: BoardType[] = [
  'solo-pernottamento',
  'colazione',
  'colazione',
  'mezza-pensione',
];

/**
 * Provider dimostrativo: nessuna rete, prezzi generati da un modello
 * stagionale con rumore e occasionali eventi di svendita. Serve a far girare
 * e valutare il motore offline. I prezzi NON sono reali: per i prezzi veri
 * si configura PROVIDER=amadeus.
 */
export class SampleProvider implements PriceProvider {
  readonly name = 'sample';

  async isReady(): Promise<{ ready: boolean; reason?: string }> {
    return {
      ready: true,
      reason: 'Dataset dimostrativo: prezzi simulati, utile per provare il motore.',
    };
  }

  async search(query: ProviderQuery): Promise<{ hotels: Hotel[]; offers: Offer[] }> {
    const { destination, window } = query;
    const hotels = sampleHotelsByDestination.get(destination.id) ?? [];
    const nights = nightsBetween(window.checkIn, window.checkOut);
    if (nights <= 0) return { hotels: [], offers: [] };

    const observedAt = new Date().toISOString();
    const offers: Offer[] = [];
    const available: Hotel[] = [];

    for (const hotel of hotels) {
      const random = makeRandom(`${hotel.id}:${window.checkIn}:${window.checkOut}`);
      const season = seasonalFactor(destination.kind, window.checkIn);

      // Fuori stagione molte strutture di mare e montagna sono chiuse.
      if (season < 0.55 && random() < 0.6) continue;
      // Nel picco assoluto capita di non trovare nulla.
      if (season > 1.5 && random() < 0.35) continue;

      available.push(hotel);
      const month = window.checkIn.slice(5, 7);
      const reference = hotel.priceProfile?.[month] ?? 400;
      const weekend = weekendFactor(window.checkIn, destination.kind);

      const variants = 1 + Math.floor(random() * 2);
      for (let v = 0; v < variants; v += 1) {
        // Rumore ordinario di listino.
        let factor = between(random, 0.88, 1.3);

        // Evento di svendita: camere invendute, cancellazioni, tariffa non rimborsabile.
        const flashSale = random() < 0.13;
        if (flashSale) factor *= between(random, 0.42, 0.72);

        // Soggiorni lunghi costano meno a notte.
        const stayDiscount = nights >= 5 ? 0.88 : nights >= 3 ? 0.95 : 1;

        const nightlyPrice = Math.round(reference * weekend * factor * stayDiscount);
        const board = pick(random, BOARDS);
        const refundable = flashSale ? random() < 0.35 : random() < 0.75;
        const roomsLeft = flashSale ? 1 + Math.floor(random() * 3) : 1 + Math.floor(random() * 8);

        const offer: Offer = {
          id: `${hotel.id}:${window.checkIn}:${v}`,
          hotelId: hotel.id,
          checkIn: window.checkIn,
          checkOut: window.checkOut,
          nights,
          guests: window.guests,
          roomName: pick(random, ROOMS),
          board,
          refundable,
          totalPrice: nightlyPrice * nights,
          nightlyPrice,
          currency: 'EUR',
          roomsLeft,
          source: this.name,
          observedAt,
        };

        // Il venditore spesso sbandiera un "prezzo pieno" gonfiato: lo registriamo
        // per poterlo smentire, non per fidarcene.
        if (random() < 0.5) {
          offer.advertisedBasePrice = Math.round(nightlyPrice * between(random, 1.35, 2.1));
        }

        offers.push(offer);
      }
    }

    return { hotels: available, offers };
  }
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T12:00:00Z`).getTime();
  const b = new Date(`${checkOut}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

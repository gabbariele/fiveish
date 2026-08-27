import { config } from '../config.js';
import type { BoardType, Hotel, Offer, PriceProvider, ProviderQuery } from '../types.js';

const HOSTS = {
  test: 'https://test.api.amadeus.com',
  production: 'https://api.amadeus.com',
} as const;

/** Amadeus accetta liste di hotelIds, ma non infinite: si va a blocchi. */
const BATCH_SIZE = 20;

interface AmadeusHotelRef {
  hotelId: string;
  name?: string;
  rating?: string;
  geoCode?: { latitude: number; longitude: number };
}

interface AmadeusOfferItem {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  boardType?: string;
  room?: { typeEstimated?: { category?: string; bedType?: string }; description?: { text?: string } };
  policies?: {
    refundable?: { cancellationRefund?: string };
    cancellations?: Array<{ deadline?: string; amount?: string }>;
  };
  price?: { currency?: string; base?: string; total?: string };
}

interface AmadeusOfferGroup {
  hotel: AmadeusHotelRef;
  available?: boolean;
  offers?: AmadeusOfferItem[];
}

const BOARD_MAP: Record<string, BoardType> = {
  ROOM_ONLY: 'solo-pernottamento',
  BREAKFAST: 'colazione',
  HALF_BOARD: 'mezza-pensione',
  FULL_BOARD: 'pensione-completa',
  ALL_INCLUSIVE: 'all-inclusive',
};

/**
 * Prezzi reali via Amadeus Self-Service API.
 *
 * Serve una app gratuita su https://developers.amadeus.com. L'ambiente `test`
 * e' gratuito ma copre un sottoinsieme di strutture con dati non sempre
 * aggiornati; per il live serve promuovere l'app a produzione.
 *
 * Il filtro 5 stelle e' applicato alla fonte (`ratings=5`): gli hotel di
 * categoria inferiore non entrano mai nel sistema.
 */
export class AmadeusProvider implements PriceProvider {
  readonly name = 'amadeus';
  private token: { value: string; expiresAt: number } | undefined;
  private readonly host: string;
  /** Anagrafica hotel gia' risolta, per non richiederla a ogni finestra di date. */
  private readonly hotelCache = new Map<string, Hotel[]>();
  private readonly ratingCache = new Map<string, number>();

  constructor(
    private readonly clientId = config.amadeus.clientId,
    private readonly clientSecret = config.amadeus.clientSecret,
    env: 'test' | 'production' = config.amadeus.env,
  ) {
    this.host = HOSTS[env];
  }

  async isReady(): Promise<{ ready: boolean; reason?: string }> {
    if (!this.clientId || !this.clientSecret) {
      return {
        ready: false,
        reason: 'Mancano AMADEUS_CLIENT_ID e AMADEUS_CLIENT_SECRET nel file .env',
      };
    }
    try {
      await this.accessToken();
      return { ready: true };
    } catch (error) {
      return { ready: false, reason: `Autenticazione Amadeus fallita: ${message(error)}` };
    }
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;

    const response = await fetch(`${this.host}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });
    if (!response.ok) {
      throw new Error(`token HTTP ${response.status}: ${await response.text()}`);
    }
    const json = (await response.json()) as { access_token: string; expires_in: number };
    this.token = {
      value: json.access_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
    return this.token.value;
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const token = await this.accessToken();
    const url = new URL(path, this.host);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

    const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (response.status === 429) throw new Error('limite di chiamate Amadeus raggiunto (429)');
    if (!response.ok) throw new Error(`HTTP ${response.status} su ${path}: ${await response.text()}`);
    return (await response.json()) as T;
  }

  /** Elenco dei 5 stelle di una citta'. Il filtro categoria e' lato Amadeus. */
  private async hotelsForCity(cityCode: string, destinationId: string): Promise<Hotel[]> {
    const cached = this.hotelCache.get(cityCode);
    if (cached) return cached;

    const json = await this.get<{ data?: AmadeusHotelRef[] }>(
      '/v1/reference-data/locations/hotels/by-city',
      { cityCode, ratings: '5', radius: '30', radiusUnit: 'KM', hotelSource: 'ALL' },
    );
    const refs = json.data ?? [];
    const ratings = await this.sentiments(refs.map((r) => r.hotelId));

    const hotels: Hotel[] = refs.map((ref) => ({
      id: ref.hotelId,
      name: ref.name ?? ref.hotelId,
      destinationId,
      stars: 5,
      guestRating: ratings.get(ref.hotelId) ?? 8.8,
      reviewCount: 0,
      amenities: [],
    }));
    this.hotelCache.set(cityCode, hotels);
    return hotels;
  }

  /**
   * Voto ospiti dalla Hotel Ratings API (scala 0-100 -> 0-10). E' un endpoint
   * accessorio: se non risponde si prosegue con il voto neutro di default.
   */
  private async sentiments(hotelIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    const missing = hotelIds.filter((id) => !this.ratingCache.has(id));
    for (const batch of chunk(missing, BATCH_SIZE)) {
      try {
        const json = await this.get<{ data?: Array<{ hotelId: string; overallRating?: number }> }>(
          '/v2/e-reputation/hotel-sentiments',
          { hotelIds: batch.join(',') },
        );
        for (const item of json.data ?? []) {
          if (typeof item.overallRating === 'number') {
            this.ratingCache.set(item.hotelId, item.overallRating / 10);
          }
        }
      } catch {
        // Nessun voto disponibile: non e' un motivo per fermare la scansione.
      }
    }
    for (const id of hotelIds) {
      const rating = this.ratingCache.get(id);
      if (rating !== undefined) result.set(id, rating);
    }
    return result;
  }

  async search(query: ProviderQuery): Promise<{ hotels: Hotel[]; offers: Offer[] }> {
    const { destination, window } = query;
    const hotels = await this.hotelsForCity(destination.cityCode, destination.id);
    if (hotels.length === 0) return { hotels: [], offers: [] };

    const byId = new Map(hotels.map((h) => [h.id, h]));
    const observedAt = new Date().toISOString();
    const offers: Offer[] = [];
    const seen: Hotel[] = [];

    for (const batch of chunk(hotels.map((h) => h.id), BATCH_SIZE)) {
      let groups: AmadeusOfferGroup[];
      try {
        const json = await this.get<{ data?: AmadeusOfferGroup[] }>('/v3/shopping/hotel-offers', {
          hotelIds: batch.join(','),
          adults: String(window.guests),
          checkInDate: window.checkIn,
          checkOutDate: window.checkOut,
          roomQuantity: '1',
          currency: 'EUR',
          bestRateOnly: 'false',
        });
        groups = json.data ?? [];
      } catch (error) {
        // Un blocco che fallisce non deve invalidare l'intera destinazione.
        if (message(error).includes('429')) await sleep(1500);
        continue;
      }

      for (const group of groups) {
        const hotel = byId.get(group.hotel.hotelId);
        if (!hotel) continue;
        if (group.available === false) continue;
        let hasOffer = false;

        for (const item of group.offers ?? []) {
          const total = Number(item.price?.total ?? item.price?.base);
          if (!Number.isFinite(total) || total <= 0) continue;
          if ((item.price?.currency ?? 'EUR') !== 'EUR') continue;

          const nights = nightsBetween(item.checkInDate, item.checkOutDate);
          if (nights <= 0) continue;

          hasOffer = true;
          offers.push({
            id: item.id,
            hotelId: hotel.id,
            checkIn: item.checkInDate,
            checkOut: item.checkOutDate,
            nights,
            guests: window.guests,
            roomName:
              item.room?.description?.text?.split('\n')[0]?.slice(0, 90) ??
              item.room?.typeEstimated?.category ??
              'Camera',
            board: BOARD_MAP[item.boardType ?? 'ROOM_ONLY'] ?? 'solo-pernottamento',
            refundable: isRefundable(item),
            totalPrice: Math.round(total),
            nightlyPrice: Math.round(total / nights),
            currency: 'EUR',
            source: this.name,
            observedAt,
          });
        }
        if (hasOffer) seen.push(hotel);
      }
      // L'ambiente self-service e' limitato a poche chiamate al secondo.
      await sleep(220);
    }

    return { hotels: seen, offers };
  }
}

function isRefundable(item: AmadeusOfferItem): boolean {
  if (item.policies?.refundable?.cancellationRefund === 'REFUNDABLE_UP_TO_DEADLINE') return true;
  const cancellations = item.policies?.cancellations ?? [];
  return cancellations.some((c) => c.deadline !== undefined && c.amount === '0');
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T12:00:00Z`).getTime();
  const b = new Date(`${checkOut}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

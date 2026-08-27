import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/store/store.js';
import type { Destination, Hotel, Offer } from '../src/types.js';

export function tempStore(): { store: Store; dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'fiveish-test-'));
  return {
    store: new Store(dir),
    dir,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

export const testDestination: Destination = {
  id: 'test-citta',
  name: 'Testopoli',
  region: 'Regione Test',
  cityCode: 'TST',
  kind: 'citta',
  lat: 45,
  lon: 9,
};

export function makeHotel(overrides: Partial<Hotel> = {}): Hotel {
  return {
    id: 'hotel-test',
    name: 'Grand Hotel Test',
    destinationId: testDestination.id,
    stars: 5,
    guestRating: 9.2,
    reviewCount: 1200,
    amenities: ['spa'],
    priceProfile: { '06': 500 },
    ...overrides,
  };
}

export function makeOffer(overrides: Partial<Offer> = {}): Offer {
  const nightlyPrice = overrides.nightlyPrice ?? 250;
  const nights = overrides.nights ?? 2;
  return {
    id: 'offer-test',
    hotelId: 'hotel-test',
    checkIn: '2026-06-12',
    checkOut: '2026-06-14',
    nights,
    guests: 2,
    roomName: 'Camera Deluxe',
    board: 'colazione',
    refundable: true,
    totalPrice: nightlyPrice * nights,
    nightlyPrice,
    currency: 'EUR',
    source: 'test',
    observedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Data "adesso" fissa nei test: le soglie dipendono dai giorni al check-in. */
export const NOW = new Date('2026-05-01T00:00:00.000Z');
